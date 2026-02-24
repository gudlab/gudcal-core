import { notFound } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { prisma } from "@/lib/db";
import { GuestRescheduleForm } from "@/components/bookings/guest-reschedule-form";

export const metadata = {
  title: "Reschedule Booking – GudCal",
};

interface RescheduleBookingPageProps {
  params: Promise<{ uid: string }>;
}

export default async function RescheduleBookingPage({ params }: RescheduleBookingPageProps) {
  const { uid } = await params;

  const booking = await prisma.booking.findUnique({
    where: { uid },
    include: {
      eventType: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          duration: true,
          color: true,
          locationType: true,
          locationValue: true,
          customQuestions: true,
        },
      },
      host: {
        select: {
          name: true,
          username: true,
          image: true,
          bio: true,
          timezone: true,
        },
      },
    },
  });

  if (!booking) notFound();

  if (booking.status === "CANCELLED" || booking.status === "RESCHEDULED") {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Cannot Reschedule</h1>
        <p className="text-muted-foreground">
          This booking has already been {booking.status.toLowerCase()} and cannot be rescheduled.
        </p>
      </div>
    );
  }

  const guestStart = toZonedTime(booking.startTime, booking.guestTimezone);
  const guestEnd = toZonedTime(booking.endTime, booking.guestTimezone);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Reschedule Booking</h1>
        <p className="text-muted-foreground">
          {booking.eventType.title} with {booking.host.name} &middot;{" "}
          {format(guestStart, "EEEE, MMMM d")} at {format(guestStart, "h:mm a")} –{" "}
          {format(guestEnd, "h:mm a")}
        </p>
      </div>

      <GuestRescheduleForm
        bookingUid={uid}
        guestEmail={booking.guestEmail}
        eventType={{
          id: booking.eventType.id,
          title: booking.eventType.title,
          slug: booking.eventType.slug,
          description: booking.eventType.description,
          duration: booking.eventType.duration,
          color: booking.eventType.color,
          locationType: booking.eventType.locationType,
          locationValue: booking.eventType.locationValue,
          customQuestions: booking.eventType.customQuestions as
            | { id: string; type: string; label: string; required: boolean; options?: string[] }[]
            | null,
        }}
        user={{
          name: booking.host.name,
          username: booking.host.username!,
          image: booking.host.image,
          bio: booking.host.bio,
          timezone: booking.host.timezone,
        }}
        prefillGuest={{
          name: booking.guestName,
          email: booking.guestEmail,
          timezone: booking.guestTimezone,
          notes: booking.notes ?? undefined,
        }}
      />
    </div>
  );
}
