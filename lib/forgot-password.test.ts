import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

import {
  FORGOT_PASSWORD_EMAIL_REQUIRED,
  FORGOT_PASSWORD_INVALID_REQUEST,
  GENERIC_FORGOT_PASSWORD_MESSAGE,
  classifyForgotPasswordUser,
  parseForgotPasswordEmail,
  readForgotPasswordBody,
  runForgotPassword,
  type ForgotPasswordDeps,
} from "./forgot-password";

function deps(overrides: Partial<ForgotPasswordDeps> = {}): ForgotPasswordDeps {
  return {
    findUser: async () => null,
    deleteTokens: async () => {},
    createToken: async () => {},
    sendResetEmail: async () => {},
    sendOAuthEmail: async () => {},
    baseUrl: "https://gudcal.com",
    now: () => Date.parse("2026-10-13T13:00:00.000Z"),
    randomToken: () => "tok_test",
    ...overrides,
  };
}

describe("classifyForgotPasswordUser", () => {
  it("splits no_user, oauth_only, and has_password", () => {
    assert.equal(classifyForgotPasswordUser(null), "no_user");
    assert.equal(
      classifyForgotPasswordUser({
        email: "a@b.co",
        name: "A",
        password: null,
      }),
      "oauth_only",
    );
    assert.equal(
      classifyForgotPasswordUser({
        email: "a@b.co",
        name: "A",
        password: "hashed",
      }),
      "has_password",
    );
  });
});

describe("runForgotPassword", () => {
  it("returns no_user and sends nothing when the account is missing", async () => {
    let oauth = 0;
    let reset = 0;
    const outcome = await runForgotPassword(
      "missing@example.com",
      deps({
        sendOAuthEmail: async () => {
          oauth += 1;
        },
        sendResetEmail: async () => {
          reset += 1;
        },
      }),
    );
    assert.equal(outcome, "no_user");
    assert.equal(oauth, 0);
    assert.equal(reset, 0);
  });

  it("sends the Google sign-in email for OAuth-only users and skips reset tokens", async () => {
    const oauth: { loginUrl: string; email: string }[] = [];
    let created = 0;
    const outcome = await runForgotPassword(
      "oauth@example.com",
      deps({
        findUser: async () => ({
          email: "oauth@example.com",
          name: "OAuth User",
          password: null,
        }),
        createToken: async () => {
          created += 1;
        },
        sendOAuthEmail: async (opts) => {
          oauth.push({ loginUrl: opts.loginUrl, email: opts.email });
        },
      }),
    );
    assert.equal(outcome, "no_password_oauth_email_sent");
    assert.equal(created, 0);
    assert.equal(oauth.length, 1);
    assert.equal(oauth[0].loginUrl, "https://gudcal.com/login");
  });

  it("creates a token and sends the reset email when the user has a password", async () => {
    const tokens: { email: string; token: string }[] = [];
    const resets: string[] = [];
    const outcome = await runForgotPassword(
      "haspw@example.com",
      deps({
        findUser: async () => ({
          email: "haspw@example.com",
          name: "Pat",
          password: "hashed",
        }),
        createToken: async (data) => {
          tokens.push({ email: data.email, token: data.token });
        },
        sendResetEmail: async (opts) => {
          resets.push(opts.resetUrl);
        },
      }),
    );
    assert.equal(outcome, "reset_sent");
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].token, "tok_test");
    assert.equal(
      resets[0],
      "https://gudcal.com/reset-password?token=tok_test",
    );
  });

  it("propagates send failures so the route can log send_failed", async () => {
    await assert.rejects(
      () =>
        runForgotPassword(
          "haspw@example.com",
          deps({
            findUser: async () => ({
              email: "haspw@example.com",
              name: "Pat",
              password: "hashed",
            }),
            sendResetEmail: async () => {
              throw new Error("Invalid from");
            },
          }),
        ),
      /Invalid from/,
    );
  });
});

describe("forgot-password request parsing", () => {
  it("malformed JSON -> 400 + bad_request", async () => {
    const parsed = await readForgotPasswordBody({
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });
    assert.equal(parsed.ok, false);
    if (parsed.ok) throw new Error("expected parse failure");
    assert.equal(parsed.error, FORGOT_PASSWORD_INVALID_REQUEST);

    const route = readFileSync("app/api/auth/forgot-password/route.ts", "utf8");
    assert.match(route, /readForgotPasswordBody\(req\)/);
    assert.match(route, /logForgotPasswordOutcome\("bad_request"\)/);
    assert.match(route, /status: 400/);
    assert.doesNotMatch(
      route.slice(0, route.indexOf("runForgotPassword")),
      /send_failed/,
    );
  });

  it("missing email -> 400", () => {
    for (const body of [null, {}, { email: null }, { email: 1 }, []]) {
      const parsed = parseForgotPasswordEmail(body);
      assert.equal(parsed.ok, false, `expected 400 for ${JSON.stringify(body)}`);
      if (parsed.ok) throw new Error("expected parse failure");
      assert.equal(parsed.error, FORGOT_PASSWORD_EMAIL_REQUIRED);
    }
    const route = readFileSync("app/api/auth/forgot-password/route.ts", "utf8");
    assert.match(route, /logForgotPasswordOutcome\("bad_request"\)/);
    assert.match(route, /{ error: parsed\.error }, { status: 400 }/);
  });

  it("trims and lowercases ' User@Example.com ' before lookup", () => {
    const parsed = parseForgotPasswordEmail({ email: " User@Example.com " });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) throw new Error("expected parse success");
    assert.equal(parsed.email, "user@example.com");
  });
});

describe("forgot-password route contract", () => {
  it("returns the same generic success body on every path, including send_failed", () => {
    const route = readFileSync("app/api/auth/forgot-password/route.ts", "utf8");
    assert.match(route, /GENERIC_FORGOT_PASSWORD_MESSAGE/);
    assert.match(route, /logForgotPasswordOutcome\(outcome\)/);
    assert.match(route, /Forgot password error/);
    assert.match(route, /logForgotPasswordOutcome\("send_failed"\)/);
    assert.doesNotMatch(route, /status: 500/);
    assert.equal(
      GENERIC_FORGOT_PASSWORD_MESSAGE,
      "If an account exists, a reset link has been sent.",
    );
  });

  it("password reset send throws on Resend {error}; OAuth reminder links to /login", () => {
    const emails = readFileSync("lib/emails.ts", "utf8");
    assert.match(emails, /throwOnError: true/);
    assert.match(emails, /sendOAuthSignInEmail/);
    assert.match(emails, /OAuthSignInReminderEmail/);

    const template = readFileSync("emails/oauth-signin-reminder.tsx", "utf8");
    assert.match(template, /Continue with Google/);
    assert.match(template, /loginUrl/);
  });

  it("uses runtime APP_URL before NEXT_PUBLIC_APP_URL for reset and login links", () => {
    const route = readFileSync("app/api/auth/forgot-password/route.ts", "utf8");
    assert.match(route, /process\.env\.APP_URL\?\.trim\(\)/);
    assert.match(route, /env\.NEXT_PUBLIC_APP_URL/);
  });
});
