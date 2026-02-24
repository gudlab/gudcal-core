import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/bookings/:uid — Get a single booking
export async function GET(
  req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const { uid } = await params;

  const booking = await prisma.booking.findFirst({
    where: { uid, userId: user!.id },
    include: {
      eventType: {
        select: { title: true, slug: true, duration: true, locationType: true },
      },
    },
  });

  if (!booking) {
    return NextResponse.json(
      { error: "Booking not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    uid: booking.uid,
    eventType: booking.eventType.title,
    eventSlug: booking.eventType.slug,
    duration: booking.eventType.duration,
    locationType: booking.eventType.locationType,
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    guestTimezone: booking.guestTimezone,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    location: booking.location,
    notes: booking.notes,
    cancelReason: booking.cancelReason,
    metadata: booking.metadata,
    createdAt: booking.createdAt,
  });
}

// PATCH /api/v1/bookings/:uid — Update a booking (confirm, cancel, reschedule)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const { uid } = await params;

  try {
    const booking = await prisma.booking.findFirst({
      where: { uid, userId: user!.id },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { action, reason } = body;

    switch (action) {
      case "confirm": {
        if (booking.status !== "PENDING") {
          return NextResponse.json(
            { error: "Only pending bookings can be confirmed" },
            { status: 400 },
          );
        }
        const updated = await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "CONFIRMED" },
        });
        return NextResponse.json({
          uid: updated.uid,
          status: updated.status,
          message: "Booking confirmed",
        });
      }

      case "cancel": {
        if (booking.status === "CANCELLED") {
          return NextResponse.json(
            { error: "Booking is already cancelled" },
            { status: 400 },
          );
        }
        const updated = await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELLED",
            cancelReason: reason || null,
          },
        });
        return NextResponse.json({
          uid: updated.uid,
          status: updated.status,
          message: "Booking cancelled",
        });
      }

      case "no_show": {
        const updated = await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "NO_SHOW" },
        });
        return NextResponse.json({
          uid: updated.uid,
          status: updated.status,
          message: "Booking marked as no-show",
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Use: confirm, cancel, or no_show",
          },
          { status: 400 },
        );
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
