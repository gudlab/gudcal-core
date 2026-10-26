import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoogleAuthUrl } from "@/lib/calendar/google";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_MS,
  createOauthState,
  hasOauthStateSecret,
  isGoogleCalendarConfigured,
  oauthNonceCookieOptions,
} from "@/lib/calendar/oauth-state";

function appRedirect(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return appRedirect(request, "/login");
  }

  if (!hasOauthStateSecret()) {
    return appRedirect(request, "/dashboard/integrations?error=missing_secret");
  }

  if (!isGoogleCalendarConfigured()) {
    return appRedirect(request, "/dashboard/integrations?error=not_configured");
  }

  const { state, nonce } = createOauthState(userId);
  const response = NextResponse.redirect(getGoogleAuthUrl(state));
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    nonce,
    oauthNonceCookieOptions(Math.floor(OAUTH_STATE_TTL_MS / 1000)),
  );
  return response;
}
