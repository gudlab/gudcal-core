import { redirect } from "next/navigation";
import Link from "next/link";

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
import { Icons } from "@/components/shared/icons";
import { DisconnectCalendarButton } from "@/components/integrations/disconnect-calendar-button";

export const metadata = {
  title: "Integrations – GudCal",
};

export default async function IntegrationsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const googleConnection = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId, provider: "GOOGLE" } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your calendars and other tools
        </p>
      </div>

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
                    {googleConnection
                      ? `Connected as ${googleConnection.email ?? "unknown"}`
                      : "Check for conflicts and create events automatically"}
                  </CardDescription>
                </div>
              </div>
              {googleConnection ? (
                <DisconnectCalendarButton provider="GOOGLE" />
              ) : (
                <Button asChild>
                  <Link href="/api/calendar/google/connect">Connect</Link>
                </Button>
              )}
            </div>
          </CardHeader>
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
