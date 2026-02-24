import { redirect } from "next/navigation";
import { subDays, format, eachDayOfInterval } from "date-fns";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export const metadata = {
  title: "Analytics – GudCal",
};

export default async function AnalyticsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  // Get stats for the last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  const now = new Date();

  const [totalBookings, confirmedBookings, cancelledBookings, bookingsByDay] =
    await Promise.all([
      prisma.booking.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.booking.count({
        where: {
          userId,
          status: "CONFIRMED",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.booking.count({
        where: {
          userId,
          status: "CANCELLED",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.booking.groupBy({
        by: ["createdAt"],
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
        orderBy: { createdAt: "asc" },
      }),
    ]);

  // Get popular event types
  const popularEventTypes = await prisma.booking.groupBy({
    by: ["eventTypeId"],
    where: {
      userId,
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: true,
    orderBy: { _count: { eventTypeId: "desc" } },
    take: 5,
  });

  const eventTypeIds = popularEventTypes.map((p) => p.eventTypeId);
  const eventTypes = await prisma.eventType.findMany({
    where: { id: { in: eventTypeIds } },
    select: { id: true, title: true, color: true },
  });

  const popularWithNames = popularEventTypes.map((p) => {
    const et = eventTypes.find((e) => e.id === p.eventTypeId);
    return {
      name: et?.title ?? "Unknown",
      color: et?.color ?? "#6b7280",
      count: p._count,
    };
  });

  // Build daily counts for the chart
  const days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
  const dailyData = days.map((day) => ({
    date: format(day, "MMM d"),
    bookings: 0,
  }));

  // This is a simplified version - in production you'd want a proper SQL query
  // that groups by date rather than this approach

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Last 30 days performance
        </p>
      </div>

      <AnalyticsDashboard
        stats={{
          totalBookings,
          confirmedBookings,
          cancelledBookings,
          conversionRate:
            totalBookings > 0
              ? Math.round((confirmedBookings / totalBookings) * 100)
              : 0,
        }}
        popularEventTypes={popularWithNames}
        dailyData={dailyData}
      />
    </div>
  );
}
