import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { handleGoogleCallback } from "@/lib/calendar/google";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId
  const error = searchParams.get("error");

  if (error) {
    redirect("/dashboard/integrations?error=access_denied");
  }

  if (!code || !state) {
    redirect("/dashboard/integrations?error=missing_params");
  }

  let redirectUrl = "/dashboard/integrations?error=callback_failed";

  try {
    await handleGoogleCallback(code, state);
    redirectUrl = "/dashboard/integrations?success=google_connected";
  } catch (err) {
    console.error("Google Calendar callback error:", err);
  }

  redirect(redirectUrl);
}
