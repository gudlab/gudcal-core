import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import {
  GuestCancelForm,
  GuestCancelSuccess,
} from "@/components/bookings/guest-cancel-form";
import {
  shouldShowGuestCancelSuccess,
  shouldStripCancelledQuery,
} from "@/lib/guest-cancel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cancel Booking – GudCal",
};

interface CancelBookingPageProps {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}

export default async function CancelBookingPage({
  params,
  searchParams,
}: CancelBookingPageProps) {
  const { uid } = await params;
  const { cancelled } = await searchParams;

  const booking = await prisma.booking.findUnique({
    where: { uid },
    include: {
      eventType: { select: { title: true, duration: true } },
      host: { select: { name: true } },
    },
  });

  if (!booking) notFound();

  if (shouldShowGuestCancelSuccess(booking.status)) {
    return (
      <div className="mx-auto max-w-md">
        <GuestCancelSuccess />
      </div>
    );
  }

  if (shouldStripCancelledQuery(booking.status, cancelled)) {
    redirect(`/booking/${uid}/cancel`);
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
