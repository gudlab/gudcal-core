import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Icons } from "@/components/shared/icons";
import { CalendarAccountRow } from "@/components/integrations/calendar-account-row";

export const metadata = {
  title: "Integrations – GudCal",
};

const CONNECT_MESSAGES: Record<
  string,
  { title: string; description: string; variant?: "default" | "destructive" }
> = {
  google_connected: {
    title: "Google Calendar connected",
    description: "Bookings can now check this calendar and create events.",
  },
  access_denied: {
    title: "Google Calendar access was denied",
    description: "Grant access and try connecting again.",
    variant: "destructive",
  },
  missing_params: {
    title: "Google Calendar connect was incomplete",
    description: "Required parameters were missing. Try connecting again.",
    variant: "destructive",
  },
  callback_failed: {
    title: "Google Calendar connect failed",
    description: "Something went wrong while finishing the connection. Try again.",
    variant: "destructive",
  },
  invalid_state: {
    title: "Google Calendar connect request was invalid",
    description:
      "The connect request was invalid or expired. Start the connection again.",
    variant: "destructive",
  },
  session_mismatch: {
    title: "Signed-in account did not match",
    description:
      "Sign in with the same account that started the Google Calendar connection, then try again.",
    variant: "destructive",
  },
  not_configured: {
    title: "Google Calendar is not configured",
    description:
      "This server is missing Google Calendar OAuth credentials. Add them and restart, then try again.",
    variant: "destructive",
  },
  missing_secret: {
    title: "Auth secret is missing",
    description:
      "This server is missing AUTH_SECRET (or NEXTAUTH_SECRET), which is required to connect calendars.",
    variant: "destructive",
  },
  calendar_limit: {
    title: "Could not add this calendar",
    description:
      "This instance reached its calendar connection limit. Disconnect an unused account and try again.",
    variant: "destructive",
  },
};

function firstQueryValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; success?: string | string[] }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const params = await searchParams;
  const success = firstQueryValue(params.success);
  const error = firstQueryValue(params.error);
  const banner = success
    ? CONNECT_MESSAGES[success]
    : error
      ? CONNECT_MESSAGES[error]
      : undefined;

  const googleConnections = await prisma.calendarConnection.findMany({
    where: { userId, provider: "GOOGLE" },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      provider: true,
      email: true,
      calendarId: true,
      isPrimary: true,
      includeInBusyCheck: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your calendars and other tools
        </p>
      </div>

      {banner ? (
        <Alert variant={banner.variant ?? "default"}>
          <AlertTitle>{banner.title}</AlertTitle>
          <AlertDescription>{banner.description}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4">
        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Icons.calendar className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Google Calendar</CardTitle>
                  <CardDescription>
                    {googleConnections.length > 0
                      ? `${googleConnections.length} account${googleConnections.length === 1 ? "" : "s"} connected`
                      : "Check for conflicts and create events automatically"}
                  </CardDescription>
                </div>
              </div>
              <Button asChild>
                <a href="/api/calendar/google/connect">
                  {googleConnections.length > 0
                    ? "Add another Google account"
                    : "Connect"}
                </a>
              </Button>
            </div>
          </CardHeader>
          {googleConnections.length > 0 ? (
            <CardContent className="space-y-3">
              {googleConnections.map((account) => (
                <CalendarAccountRow key={account.id} account={account} />
              ))}
            </CardContent>
          ) : null}
        </Card>

        {/* Zoom - Coming Soon */}
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Icons.video className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Zoom</CardTitle>
                  <CardDescription>
                    Create Zoom meeting links automatically
                  </CardDescription>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">Coming soon</span>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
