import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const OAUTH_STATE_COOKIE = "gudcal_gcal_oauth_nonce";
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const HMAC_DOMAIN = "gudcal:google-calendar-oauth-state:v1";

export type OauthStateError =
  | "invalid_state"
  | "session_mismatch"
  | "missing_secret";

export type ConsumeOauthStateResult =
  | { ok: true; userId: string }
  | { ok: false; error: OauthStateError };

export type OauthStatePayload = {
  userId: string;
  nonce: string;
  exp: number;
};

export function getOauthStateSecret(): string | undefined {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || undefined;
}

export function hasOauthStateSecret(): boolean {
  return Boolean(getOauthStateSecret());
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  );
}

function deriveSigningKey(secret: string): Buffer {
  return createHmac("sha256", secret).update(HMAC_DOMAIN).digest();
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", deriveSigningKey(secret))
    .update(encodedPayload)
    .digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function createOauthState(
  userId: string,
  now = Date.now(),
): { state: string; nonce: string; exp: number } {
  const secret = getOauthStateSecret();
  if (!secret) {
    throw new Error("missing_secret");
  }
  if (!userId) {
    throw new Error("invalid_state");
  }

  const nonce = randomBytes(16).toString("hex");
  const exp = now + OAUTH_STATE_TTL_MS;
  const encodedPayload = Buffer.from(
    JSON.stringify({ u: userId, n: nonce, e: exp }),
    "utf8",
  ).toString("base64url");
  const state = `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
  return { state, nonce, exp };
}

export function verifyOauthState(
  state: string | null | undefined,
  now = Date.now(),
):
  | { ok: true; payload: OauthStatePayload }
  | { ok: false; error: "invalid_state" | "missing_secret" } {
  const secret = getOauthStateSecret();
  if (!secret) {
    return { ok: false, error: "missing_secret" };
  }
  if (!state) {
    return { ok: false, error: "invalid_state" };
  }

  const dot = state.lastIndexOf(".");
  if (dot <= 0 || dot === state.length - 1) {
    return { ok: false, error: "invalid_state" };
  }

  const encodedPayload = state.slice(0, dot);
  const signature = state.slice(dot + 1);
  const expected = signPayload(encodedPayload, secret);
  if (!safeEqual(signature, expected)) {
    return { ok: false, error: "invalid_state" };
  }

  let parsed: { u?: unknown; n?: unknown; e?: unknown };
  try {
    parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    return { ok: false, error: "invalid_state" };
  }

  if (
    typeof parsed.u !== "string" ||
    !parsed.u ||
    typeof parsed.n !== "string" ||
    !parsed.n ||
    typeof parsed.e !== "number" ||
    !Number.isFinite(parsed.e)
  ) {
    return { ok: false, error: "invalid_state" };
  }

  if (parsed.e <= now) {
    return { ok: false, error: "invalid_state" };
  }

  return {
    ok: true,
    payload: { userId: parsed.u, nonce: parsed.n, exp: parsed.e },
  };
}

export function consumeOauthState(input: {
  state: string | null | undefined;
  sessionUserId: string | null | undefined;
  cookieNonce: string | null | undefined;
  now?: number;
}): ConsumeOauthStateResult {
  if (!getOauthStateSecret()) {
    return { ok: false, error: "missing_secret" };
  }
  if (!input.sessionUserId) {
    return { ok: false, error: "session_mismatch" };
  }

  const verified = verifyOauthState(input.state, input.now ?? Date.now());
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  if (verified.payload.userId !== input.sessionUserId) {
    return { ok: false, error: "session_mismatch" };
  }

  if (
    !input.cookieNonce ||
    !safeEqual(verified.payload.nonce, input.cookieNonce)
  ) {
    return { ok: false, error: "invalid_state" };
  }

  return { ok: true, userId: verified.payload.userId };
}

export function oauthNonceCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
