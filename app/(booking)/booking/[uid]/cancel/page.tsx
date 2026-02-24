import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { GuestCancelForm } from "@/components/bookings/guest-cancel-form";

export const metadata = {
  title: "Cancel Booking – GudCal",
};

interface CancelBookingPageProps {
  params: Promise<{ uid: string }>;
}

export default async function CancelBookingPage({ params }: CancelBookingPageProps) {
  const { uid } = await params;

  const booking = await prisma.booking.findUnique({
    where: { uid },
    include: {
      eventType: { select: { title: true, duration: true } },
      host: { select: { name: true } },
    },
  });

  if (!booking) notFound();

  if (booking.status === "CANCELLED") {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Booking Already Cancelled</h1>
        <p className="text-muted-foreground">
          This booking has already been cancelled.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Cancel Booking</h1>
        <p className="text-muted-foreground">
          Are you sure you want to cancel your {booking.eventType.title} with{" "}
          {booking.host.name}?
        </p>
      </div>

      <GuestCancelForm bookingUid={uid} />
    </div>
  );
}
