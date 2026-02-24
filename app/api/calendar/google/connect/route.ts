import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGoogleAuthUrl } from "@/lib/calendar/google";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const authUrl = getGoogleAuthUrl(userId);
  redirect(authUrl);
}
