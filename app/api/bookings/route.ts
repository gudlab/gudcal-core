import { NextResponse } from "next/server";
import { addMinutes, areIntervalsOverlapping } from "date-fns";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { buildBookingEmailData, sendBookingConfirmation } from "@/lib/emails";
import { createCalendarEventForBooking } from "@/lib/calendar/google";

const additionalGuestSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
});

const bookingSchema = z.object({
  eventTypeId: z.string().min(1),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email().max(320),
  guestTimezone: z.string().min(1).max(100),
  notes: z.string().max(2000).optional(),
  responses: z.record(z.string(), z.unknown()).optional(),
  additionalGuests: z.array(additionalGuestSchema).max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { eventTypeId, startTime: startTimeStr, guestName, guestEmail, guestTimezone, notes, responses, additionalGuests } = parsed.data;
    const startTime = new Date(startTimeStr);

    // Get event type with availability
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: {
        user: { select: { id: true, name: true, email: true, timezone: true } },
        availability: {
          include: { rules: true, dateOverrides: true },
        },
      },
    });

    if (!eventType || !eventType.isActive) {
      return NextResponse.json(
        { error: "Event type not found or inactive" },
        { status: 404 },
      );
    }

    const endTime = addMinutes(startTime, eventType.duration);

    // Resolve location from event type configuration
    const LOCATION_LABELS: Record<string, string> = {
      GOOGLE_MEET: "Google Meet",
      ZOOM: "Zoom",
      PHONE: "Phone Call",
      IN_PERSON: "In Person",
      CUSTOM: "Custom",
    };
    const resolvedLocation =
      eventType.locationValue || LOCATION_LABELS[eventType.locationType] || null;

    // Use event type's availability or user's default
    let availability = eventType.availability;
    if (!availability) {
      availability = await prisma.availability.findFirst({
        where: { userId: eventType.userId, isDefault: true },
        include: { rules: true, dateOverrides: true },
      });
    }

    if (!availability) {
      return NextResponse.json(
        { error: "No availability configured" },
        { status: 400 },
      );
    }

    // Use a transaction to prevent race conditions (double-booking)
    const booking = await prisma.$transaction(async (tx) => {
      const existingBookings = await tx.booking.findMany({
        where: {
          userId: eventType.userId,
          startTime: { lte: endTime },
          endTime: { gte: startTime },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      });

      const hasConflict = existingBookings.some((b) =>
        areIntervalsOverlapping(
          { start: startTime, end: endTime },
          {
            start: addMinutes(b.startTime, -eventType.bufferBefore),
            end: addMinutes(b.endTime, eventType.bufferAfter),
          },
        ),
      );

      if (hasConflict) {
        return null;
      }

      return tx.booking.create({
        data: {
          eventTypeId,
          userId: eventType.userId,
          guestName,
          guestEmail,
          guestTimezone,
          startTime,
          endTime,
          status: eventType.requiresConfirmation ? "PENDING" : "CONFIRMED",
          location: resolvedLocation,
          notes: notes ?? null,
          additionalGuests: additionalGuests?.length ? additionalGuests : undefined,
          metadata: responses
            ? (JSON.parse(JSON.stringify({ responses })))
            : undefined,
        },
      });
    });

    if (!booking) {
      return NextResponse.json(
        { error: "This time slot is no longer available" },
        { status: 409 },
      );
    }

    // Create Google Calendar event if booking is confirmed (not pending)
    let bookingLocation = booking.location;
    if (booking.status === "CONFIRMED") {
      const calResult = await createCalendarEventForBooking(
        eventType.userId,
        booking,
        { title: eventType.title, locationType: eventType.locationType },
      );
      if (calResult?.meetLink) {
        bookingLocation = calResult.meetLink;
      }
    }

    // TODO: Trigger webhooks

    // Send confirmation email (fire-and-forget)
    if (eventType.user.email) {
      const emailData = buildBookingEmailData({
        uid: booking.uid,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestTimezone: booking.guestTimezone,
        startTime: booking.startTime,
        endTime: booking.endTime,
        notes: booking.notes,
        location: bookingLocation,
        additionalGuests: booking.additionalGuests,
        eventType: { title: eventType.title, locationValue: eventType.locationValue },
        host: { name: eventType.user.name, email: eventType.user.email },
      });
      sendBookingConfirmation(emailData).catch(() => {});
    }

    return NextResponse.json({
      uid: booking.uid,
      status: booking.status,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
