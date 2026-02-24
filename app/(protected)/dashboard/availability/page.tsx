import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { AvailabilityCard } from "@/components/availability/availability-card";

export const metadata = {
  title: "Availability - GudCal",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function summarizeRules(
  rules: { dayOfWeek: number; startTime: string; endTime: string }[],
): string {
  if (rules.length === 0) return "No hours set";

  // Group rules by time window
  const timeGroups = new Map<string, number[]>();
  for (const rule of rules) {
    const key = `${rule.startTime}-${rule.endTime}`;
    if (!timeGroups.has(key)) {
      timeGroups.set(key, []);
    }
    timeGroups.get(key)!.push(rule.dayOfWeek);
  }

  const parts: string[] = [];
  for (const [timeRange, days] of Array.from(timeGroups)) {
    const sortedDays = days.sort((a, b) => a - b);

    // Check if days are consecutive
    let dayLabel: string;
    if (sortedDays.length === 1) {
      dayLabel = DAY_NAMES[sortedDays[0]];
    } else {
      const isConsecutive = sortedDays.every(
        (d, i) => i === 0 || d === sortedDays[i - 1] + 1,
      );
      if (isConsecutive) {
        dayLabel = `${DAY_NAMES[sortedDays[0]]}-${DAY_NAMES[sortedDays[sortedDays.length - 1]]}`;
      } else {
        dayLabel = sortedDays.map((d) => DAY_NAMES[d]).join(", ");
      }
    }

    const [start, end] = timeRange.split("-");
    parts.push(`${dayLabel} ${start}-${end}`);
  }

  return parts.join(" | ");
}

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  const availabilities = await prisma.availability.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    include: {
      rules: true,
      _count: { select: { eventTypes: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Availability</h1>
          <p className="text-muted-foreground">
            Manage your schedules and working hours
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/availability/new">
            <Icons.add className="mr-2 size-4" />
            New Schedule
          </Link>
        </Button>
      </div>

      {availabilities.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Icons.clock className="mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No schedules yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first availability schedule to define when you can be
            booked.
          </p>
          <Button asChild>
            <Link href="/dashboard/availability/new">
              <Icons.add className="mr-2 size-4" />
              Create Schedule
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {availabilities.map((availability) => (
            <AvailabilityCard
              key={availability.id}
              availability={availability}
              summary={summarizeRules(availability.rules)}
              eventTypeCount={availability._count.eventTypes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
