import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  OAUTH_STATE_TTL_MS,
  consumeOauthState,
  createOauthState,
  hasOauthStateSecret,
  oauthNonceCookieOptions,
  verifyOauthState,
} from "./oauth-state";

const TEST_SECRET = "unit-test-oauth-state-secret";

function assignNodeEnv(value: string | undefined) {
  const env = process.env as { NODE_ENV?: string };
  if (value === undefined) {
    delete env.NODE_ENV;
  } else {
    env.NODE_ENV = value;
  }
}

describe("Google calendar OAuth state", () => {
  const previousAuthSecret = process.env.AUTH_SECRET;
  const previousNextAuthSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = TEST_SECRET;
    delete process.env.NEXTAUTH_SECRET;
  });

  afterEach(() => {
    if (previousAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = previousAuthSecret;
    }
    if (previousNextAuthSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET;
    } else {
      process.env.NEXTAUTH_SECRET = previousNextAuthSecret;
    }
  });

  it("round-trips a signed state for the same user and nonce", () => {
    const now = 1_700_000_000_000;
    const { state, nonce, exp } = createOauthState("user-abc", now);

    const verified = verifyOauthState(state, now);
    assert.equal(verified.ok, true);
    if (!verified.ok) return;
    assert.equal(verified.payload.userId, "user-abc");
    assert.equal(verified.payload.nonce, nonce);
    assert.equal(verified.payload.exp, exp);

    const consumed = consumeOauthState({
      state,
      sessionUserId: "user-abc",
      cookieNonce: nonce,
      now,
    });
    assert.deepEqual(consumed, { ok: true, userId: "user-abc" });
  });

  it("rejects a tampered state", () => {
    const now = 1_700_000_000_000;
    const { state, nonce } = createOauthState("user-abc", now);
    const [payload, signature] = state.split(".");
    const flipped = payload.endsWith("A") ? "B" : "A";
    const tampered = `${payload.slice(0, -1)}${flipped}.${signature}`;

    const verified = verifyOauthState(tampered, now);
    assert.deepEqual(verified, { ok: false, error: "invalid_state" });

    const consumed = consumeOauthState({
      state: tampered,
      sessionUserId: "user-abc",
      cookieNonce: nonce,
      now,
    });
    assert.deepEqual(consumed, { ok: false, error: "invalid_state" });
  });

  it("rejects an expired state", () => {
    const now = 1_700_000_000_000;
    const { state, nonce } = createOauthState("user-abc", now);

    const consumed = consumeOauthState({
      state,
      sessionUserId: "user-abc",
      cookieNonce: nonce,
      now: now + OAUTH_STATE_TTL_MS + 1,
    });
    assert.deepEqual(consumed, { ok: false, error: "invalid_state" });
  });

  it("rejects a valid state when the session user does not match", () => {
    const now = 1_700_000_000_000;
    const { state, nonce } = createOauthState("user-abc", now);

    const consumed = consumeOauthState({
      state,
      sessionUserId: "user-other",
      cookieNonce: nonce,
      now,
    });
    assert.deepEqual(consumed, { ok: false, error: "session_mismatch" });
  });

  it("rejects a replay when the nonce cookie does not match", () => {
    const now = 1_700_000_000_000;
    const { state, nonce } = createOauthState("user-abc", now);

    const first = consumeOauthState({
      state,
      sessionUserId: "user-abc",
      cookieNonce: nonce,
      now,
    });
    assert.equal(first.ok, true);

    const replayWithoutCookie = consumeOauthState({
      state,
      sessionUserId: "user-abc",
      cookieNonce: undefined,
      now,
    });
    assert.deepEqual(replayWithoutCookie, {
      ok: false,
      error: "invalid_state",
    });

    const replayWrongNonce = consumeOauthState({
      state,
      sessionUserId: "user-abc",
      cookieNonce: "0".repeat(nonce.length),
      now,
    });
    assert.deepEqual(replayWrongNonce, { ok: false, error: "invalid_state" });
  });

  it("sets the nonce cookie Secure flag from the runtime public HTTPS URL, not NODE_ENV", () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    const previousFallbackUrl = process.env.APP_URL;
    const previousNodeEnv = process.env.NODE_ENV;

    const restore = () => {
      if (previousAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
      }
      if (previousFallbackUrl === undefined) {
        delete process.env.APP_URL;
      } else {
        process.env.APP_URL = previousFallbackUrl;
      }
      assignNodeEnv(previousNodeEnv);
    };

    try {
      // Runtime APP_URL wins over a baked-in HTTP NEXT_PUBLIC_APP_URL.
      assignNodeEnv("development");
      process.env.APP_URL = "https://cal.example.com";
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
      assert.equal(oauthNonceCookieOptions(600).secure, true);

      // Runtime HTTP APP_URL wins over an HTTPS NEXT_PUBLIC value.
      assignNodeEnv("production");
      process.env.APP_URL = "http://192.168.1.10:3000";
      process.env.NEXT_PUBLIC_APP_URL = "https://cal.example.com";
      assert.equal(oauthNonceCookieOptions(600).secure, false);

      // Whitespace APP_URL falls through to NEXT_PUBLIC_APP_URL.
      process.env.APP_URL = "   ";
      process.env.NEXT_PUBLIC_APP_URL = "https://cal.example.com";
      assert.equal(oauthNonceCookieOptions(600).secure, true);

      // Whitespace NEXT_PUBLIC_APP_URL does not block APP_URL.
      process.env.APP_URL = "https://cal.example.com";
      process.env.NEXT_PUBLIC_APP_URL = "   ";
      assert.equal(oauthNonceCookieOptions(600).secure, true);

      delete process.env.APP_URL;
      process.env.NEXT_PUBLIC_APP_URL = "http://192.168.1.10:3000";
      assignNodeEnv("production");
      assert.equal(oauthNonceCookieOptions(600).secure, false);

      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.APP_URL = "https://cal.example.com";
      assignNodeEnv("production");
      assert.equal(oauthNonceCookieOptions(600).secure, true);

      delete process.env.APP_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;
      assert.equal(
        oauthNonceCookieOptions(
          600,
          "https://cal.example.com/api/calendar/google/connect",
        ).secure,
        true,
      );

      delete process.env.APP_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;
      assignNodeEnv("production");
      assert.equal(oauthNonceCookieOptions(600).secure, false);
    } finally {
      restore();
    }
  });

  it("reports a missing signing secret", () => {
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    assert.equal(hasOauthStateSecret(), false);

    const consumed = consumeOauthState({
      state: "not-a-state",
      sessionUserId: "user-abc",
      cookieNonce: "nonce",
    });
    assert.deepEqual(consumed, { ok: false, error: "missing_secret" });
  });
});
