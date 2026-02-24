import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { EventTypeCard } from "@/components/event-types/event-type-card";
import { Icons } from "@/components/shared/icons";

export const metadata = {
  title: "Event Types – GudCal",
};

export default async function EventTypesPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  const eventTypes = await prisma.eventType.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Event Types</h1>
          <p className="text-muted-foreground">
            Create and manage your scheduling links
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/event-types/new">
            <Icons.add className="mr-2 size-4" />
            New Event Type
          </Link>
        </Button>
      </div>

      {eventTypes.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Icons.calendarClock className="mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No event types yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first event type to start accepting bookings.
          </p>
          <Button asChild>
            <Link href="/dashboard/event-types/new">
              <Icons.add className="mr-2 size-4" />
              Create Event Type
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {eventTypes.map((eventType) => (
            <EventTypeCard
              key={eventType.id}
              eventType={eventType}
              username={user.username!}
              bookingCount={eventType._count.bookings}
            />
          ))}
        </div>
      )}
    </div>
  );
}
