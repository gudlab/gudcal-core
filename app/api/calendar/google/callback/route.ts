import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CalendarLimitError } from "@/lib/calendar/connections";
import { handleGoogleCallback } from "@/lib/calendar/google";
import {
  OAUTH_STATE_COOKIE,
  consumeOauthState,
  hasOauthStateSecret,
  isGoogleCalendarConfigured,
  oauthNonceCookieOptions,
} from "@/lib/calendar/oauth-state";

function redirectToIntegrations(
  request: Request,
  query: { error?: string; success?: string },
) {
  const url = new URL("/dashboard/integrations", request.url);
  if (query.error) {
    url.searchParams.set("error", query.error);
  }
  if (query.success) {
    url.searchParams.set("success", query.success);
  }

  const response = NextResponse.redirect(url);
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    "",
    oauthNonceCookieOptions(0, request.url),
  );
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return redirectToIntegrations(request, { error: "access_denied" });
  }

  if (!hasOauthStateSecret()) {
    return redirectToIntegrations(request, { error: "missing_secret" });
  }

  if (!isGoogleCalendarConfigured()) {
    return redirectToIntegrations(request, { error: "not_configured" });
  }

  if (!code || !state) {
    return redirectToIntegrations(request, { error: "missing_params" });
  }

  const session = await auth();
  const cookieStore = await cookies();
  const consumed = consumeOauthState({
    state,
    sessionUserId: session?.user?.id,
    cookieNonce: cookieStore.get(OAUTH_STATE_COOKIE)?.value,
  });

  if (!consumed.ok) {
    return redirectToIntegrations(request, { error: consumed.error });
  }

  try {
    await handleGoogleCallback(code, consumed.userId);
    return redirectToIntegrations(request, { success: "google_connected" });
  } catch (err) {
    if (err instanceof CalendarLimitError) {
      return redirectToIntegrations(request, { error: "calendar_limit" });
    }
    console.error("Google Calendar callback error:", err);
    return redirectToIntegrations(request, { error: "callback_failed" });
  }
}
