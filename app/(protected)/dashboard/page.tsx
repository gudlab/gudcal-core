import Link from "next/link";
import { redirect } from "next/navigation";
import { addDays, format } from "date-fns";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { constructMetadata } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { DashboardBookingLink } from "@/components/dashboard/dashboard-booking-link";

export const metadata = constructMetadata({
  title: "Dashboard \u2013 GudCal",
  description: "Your scheduling overview.",
});

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = session.user;
  const now = new Date();
  const weekFromNow = addDays(now, 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [upcomingCount, pendingCount, monthlyBookings, activeEventTypes, nextBookings] =
    await Promise.all([
      prisma.booking.count({
        where: {
          userId,
          startTime: { gte: now, lte: weekFromNow },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      }),
      prisma.booking.count({
        where: { userId, status: "PENDING" },
      }),
      prisma.booking.count({
        where: {
          userId,
          startTime: { gte: startOfMonth, lte: endOfMonth },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      }),
      prisma.eventType.count({
        where: { userId, isActive: true },
      }),
      prisma.booking.findMany({
        where: {
          userId,
          startTime: { gte: now },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
        include: {
          eventType: {
            select: { title: true, color: true, duration: true, locationType: true },
          },
        },
        orderBy: { startTime: "asc" },
        take: 5,
      }),
    ]);

  const stats = [
    {
      title: "Upcoming (7d)",
      value: upcomingCount,
      icon: "calendar" as const,
      href: "/dashboard/bookings",
    },
    {
      title: "Pending",
      value: pendingCount,
      icon: "clock" as const,
      href: "/dashboard/bookings",
    },
    {
      title: "This Month",
      value: monthlyBookings,
      icon: "calendarClock" as const,
      href: "/dashboard/bookings",
    },
    {
      title: "Event Types",
      value: activeEventTypes,
      icon: "zap" as const,
      href: "/dashboard/event-types",
    },
  ];

  const quickActions = [
    {
      title: "Create Event Type",
      href: "/dashboard/event-types/new",
      icon: "add" as const,
    },
    {
      title: "View Bookings",
      href: "/dashboard/bookings",
      icon: "clock" as const,
    },
    {
      title: "Manage Availability",
      href: "/dashboard/availability",
      icon: "calendar" as const,
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: "settings" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with greeting and booking link */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{user.name ? `, ${user.name}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your schedule.
          </p>
        </div>
        {user.username && <DashboardBookingLink username={user.username} />}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const IconComp = Icons[stat.icon];
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <IconComp className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Upcoming meetings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming Meetings</CardTitle>
            <CardDescription>Your next scheduled bookings</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/bookings">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {nextBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Icons.calendar className="mb-3 size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No upcoming meetings</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your booking page to start receiving bookings.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {nextBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: booking.eventType.color,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {booking.eventType.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.guestName} &middot;{" "}
                        {booking.eventType.duration} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium">
                        {format(booking.startTime, "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(booking.startTime, "h:mm a")}
                      </p>
                    </div>
                    <p className="text-sm font-medium sm:hidden">
                      {format(booking.startTime, "MMM d")}
                    </p>
                    <Badge
                      variant={
                        booking.status === "CONFIRMED"
                          ? "default"
                          : "secondary"
                      }
                      className="shrink-0"
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => {
            const IconComp = Icons[action.icon];
            return (
              <Button
                key={action.title}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                asChild
              >
                <Link href={action.href}>
                  <IconComp className="size-5 text-muted-foreground" />
                  <span className="text-xs">{action.title}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
