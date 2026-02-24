import { notFound } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

export const metadata = {
  title: "Booking Confirmation – GudCal",
};

interface BookingPageProps {
  params: Promise<{ uid: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { uid } = await params;

  const booking = await prisma.booking.findUnique({
    where: { uid },
    include: {
      eventType: {
        select: {
          title: true,
          duration: true,
          locationType: true,
          locationValue: true,
          color: true,
        },
      },
      host: { select: { name: true, image: true, username: true } },
    },
  });

  if (!booking) notFound();

  const guestStart = toZonedTime(booking.startTime, booking.guestTimezone);
  const guestEnd = toZonedTime(booking.endTime, booking.guestTimezone);

  const statusMessages: Record<string, { title: string; description: string; icon: string }> = {
    CONFIRMED: {
      title: "Booking Confirmed",
      description: "Your meeting has been scheduled. A confirmation email has been sent with the details.",
      icon: "check",
    },
    PENDING: {
      title: "Booking Pending",
      description: "Your booking request has been submitted and is awaiting confirmation from the host.",
      icon: "clock",
    },
    CANCELLED: {
      title: "Booking Cancelled",
      description: "This booking has been cancelled.",
      icon: "close",
    },
    RESCHEDULED: {
      title: "Booking Rescheduled",
      description: "This booking has been rescheduled to a new time.",
      icon: "calendar",
    },
  };

  const statusInfo = statusMessages[booking.status] ?? statusMessages.CONFIRMED;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <div
            className={`flex size-12 items-center justify-center rounded-full ${
              booking.status === "CONFIRMED"
                ? "bg-green-100 dark:bg-green-900/30"
                : booking.status === "CANCELLED"
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-yellow-100 dark:bg-yellow-900/30"
            }`}
          >
            <Icons.check
              className={`size-6 ${
                booking.status === "CONFIRMED"
                  ? "text-green-600"
                  : booking.status === "CANCELLED"
                    ? "text-red-600"
                    : "text-yellow-600"
              }`}
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold">{statusInfo.title}</h1>
        <p className="text-muted-foreground">{statusInfo.description}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-1 rounded-full"
              style={{ backgroundColor: booking.eventType.color }}
            />
            <h2 className="font-semibold">{booking.eventType.title}</h2>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Icons.calendar className="size-4 text-muted-foreground" />
              <span>{format(guestStart, "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.clock className="size-4 text-muted-foreground" />
              <span>
                {format(guestStart, "h:mm a")} – {format(guestEnd, "h:mm a")}{" "}
                ({booking.guestTimezone.replace(/_/g, " ")})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.users className="size-4 text-muted-foreground" />
              <span>with {booking.host.name}</span>
            </div>
          </div>

          {booking.notes && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium text-xs text-muted-foreground mb-1">Notes</p>
              <p>{booking.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
        <div className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href={`/booking/${uid}/reschedule`}>Reschedule</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/booking/${uid}/cancel`}>Cancel Booking</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
