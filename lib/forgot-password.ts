export const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If an account exists, a reset link has been sent.";

export type ForgotPasswordOutcome =
  | "no_user"
  | "no_password_oauth_email_sent"
  | "reset_sent"
  | "send_failed"
  | "bad_request";

export const FORGOT_PASSWORD_EMAIL_REQUIRED = "Email is required";
export const FORGOT_PASSWORD_INVALID_REQUEST = "Invalid request";

export type ForgotPasswordParseResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export function parseForgotPasswordEmail(
  body: unknown,
): ForgotPasswordParseResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: FORGOT_PASSWORD_EMAIL_REQUIRED };
  }
  const email = (body as { email?: unknown }).email;
  if (!email || typeof email !== "string") {
    return { ok: false, error: FORGOT_PASSWORD_EMAIL_REQUIRED };
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, error: FORGOT_PASSWORD_EMAIL_REQUIRED };
  }
  return { ok: true, email: normalized };
}

export async function readForgotPasswordBody(req: {
  json: () => Promise<unknown>;
}): Promise<ForgotPasswordParseResult> {
  try {
    const body = await req.json();
    return parseForgotPasswordEmail(body);
  } catch {
    return { ok: false, error: FORGOT_PASSWORD_INVALID_REQUEST };
  }
}

export type ForgotPasswordUser = {
  email: string | null;
  name: string | null;
  password: string | null;
};

export function classifyForgotPasswordUser(
  user: ForgotPasswordUser | null,
): "no_user" | "oauth_only" | "has_password" {
  if (!user) return "no_user";
  if (!user.password) return "oauth_only";
  return "has_password";
}

export function logForgotPasswordOutcome(outcome: ForgotPasswordOutcome): void {
  console.info("forgot-password", { outcome });
}

export type ForgotPasswordDeps = {
  findUser: (email: string) => Promise<ForgotPasswordUser | null>;
  deleteTokens: (email: string) => Promise<void>;
  createToken: (data: {
    email: string;
    token: string;
    expires: Date;
  }) => Promise<void>;
  sendResetEmail: (opts: {
    email: string;
    firstName: string;
    resetUrl: string;
  }) => Promise<void>;
  sendOAuthEmail: (opts: {
    email: string;
    firstName: string;
    loginUrl: string;
  }) => Promise<void>;
  baseUrl: string;
  now?: () => number;
  randomToken?: () => string;
};

export async function runForgotPassword(
  email: string,
  deps: ForgotPasswordDeps,
): Promise<ForgotPasswordOutcome> {
  const user = await deps.findUser(email);
  const kind = classifyForgotPasswordUser(user);

  if (kind === "no_user" || !user) {
    return "no_user";
  }

  const firstName = user.name || "there";
  const to = user.email || email;

  if (kind === "oauth_only") {
    await deps.sendOAuthEmail({
      email: to,
      firstName,
      loginUrl: `${deps.baseUrl}/login`,
    });
    return "no_password_oauth_email_sent";
  }

  await deps.deleteTokens(email);
  const token = deps.randomToken
    ? deps.randomToken()
    : (await import("crypto")).randomBytes(32).toString("hex");
  const expires = new Date((deps.now ?? Date.now)() + 60 * 60 * 1000);
  await deps.createToken({ email, token, expires });
  await deps.sendResetEmail({
    email: to,
    firstName,
    resetUrl: `${deps.baseUrl}/reset-password?token=${token}`,
  });
  return "reset_sent";
}
