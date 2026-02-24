import { NextResponse } from "next/server";
import { addMinutes, areIntervalsOverlapping, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { buildBookingEmailData, sendBookingRescheduled } from "@/lib/emails";
import {
  createCalendarEventForBooking,
  deleteCalendarEventForBooking,
} from "@/lib/calendar/google";

const rescheduleSchema = z.object({
  originalBookingUid: z.string().min(1),
  eventTypeId: z.string().min(1),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  guestEmail: z.string().email().max(320),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = rescheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { originalBookingUid, eventTypeId, startTime: startTimeStr, guestEmail } = parsed.data;
    const newStartTime = new Date(startTimeStr);

    // Fetch original booking
    const originalBooking = await prisma.booking.findUnique({
      where: { uid: originalBookingUid },
      include: {
        eventType: true,
        host: { select: { id: true, name: true, email: true, timezone: true } },
      },
    });

    if (!originalBooking) {
      return NextResponse.json(
        { error: "Original booking not found" },
        { status: 404 },
      );
    }

    // Authorization: either the guest (email match) or the authenticated host
    const session = await auth();
    const isHost = session?.user?.id === originalBooking.userId;
    const isGuest = originalBooking.guestEmail.toLowerCase() === guestEmail.toLowerCase();

    if (!isHost && !isGuest) {
      return NextResponse.json(
        { error: "Not authorized to reschedule this booking" },
        { status: 403 },
      );
    }

    if (originalBooking.status !== "CONFIRMED" && originalBooking.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only confirmed or pending bookings can be rescheduled" },
        { status: 400 },
      );
    }

    // Get event type with availability
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: {
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

    const newEndTime = addMinutes(newStartTime, eventType.duration);

    // Use a transaction: mark old as RESCHEDULED + create new booking + conflict check
    const newBooking = await prisma.$transaction(async (tx) => {
      // Check for conflicts (exclude the original booking being rescheduled)
      const existingBookings = await tx.booking.findMany({
        where: {
          userId: originalBooking.userId,
          id: { not: originalBooking.id },
          startTime: { lte: newEndTime },
          endTime: { gte: newStartTime },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      });

      const hasConflict = existingBookings.some((b) =>
        areIntervalsOverlapping(
          { start: newStartTime, end: newEndTime },
          {
            start: addMinutes(b.startTime, -eventType.bufferBefore),
            end: addMinutes(b.endTime, eventType.bufferAfter),
          },
        ),
      );

      if (hasConflict) {
        return null;
      }

      // Mark original as rescheduled
      await tx.booking.update({
        where: { id: originalBooking.id },
        data: { status: "RESCHEDULED" },
      });

      // Create new booking linked to original
      return tx.booking.create({
        data: {
          eventTypeId,
          userId: originalBooking.userId,
          guestName: originalBooking.guestName,
          guestEmail: originalBooking.guestEmail,
          guestTimezone: originalBooking.guestTimezone,
          startTime: newStartTime,
          endTime: newEndTime,
          status: eventType.requiresConfirmation ? "PENDING" : "CONFIRMED",
          notes: originalBooking.notes,
          additionalGuests: originalBooking.additionalGuests ?? undefined,
          metadata: originalBooking.metadata ?? undefined,
          location: originalBooking.location,
          rescheduledFromId: originalBooking.id,
        },
      });
    });

    if (!newBooking) {
      return NextResponse.json(
        { error: "This time slot is no longer available" },
        { status: 409 },
      );
    }

    // Delete old Google Calendar event & create new one
    deleteCalendarEventForBooking(
      originalBooking.userId,
      originalBooking.googleEventId,
    ).catch(() => {});

    let newBookingLocation = newBooking.location;
    if (newBooking.status === "CONFIRMED") {
      const calResult = await createCalendarEventForBooking(
        originalBooking.userId,
        newBooking,
        { title: eventType.title, locationType: eventType.locationType },
      );
      if (calResult?.meetLink) {
        newBookingLocation = calResult.meetLink;
      }
    }

    // Send reschedule email (fire-and-forget)
    if (originalBooking.host.email) {
      const newEmailData = buildBookingEmailData({
        ...newBooking,
        location: newBookingLocation,
        additionalGuests: newBooking.additionalGuests,
        eventType: { title: eventType.title, locationValue: eventType.locationValue },
        host: { name: originalBooking.host.name, email: originalBooking.host.email },
      });

      const oldGuestStart = toZonedTime(originalBooking.startTime, originalBooking.guestTimezone);
      const oldGuestEnd = toZonedTime(originalBooking.endTime, originalBooking.guestTimezone);

      sendBookingRescheduled({
        ...newEmailData,
        oldDateStr: format(oldGuestStart, "EEEE, MMMM d, yyyy"),
        oldTimeStr: `${format(oldGuestStart, "h:mm a")} - ${format(oldGuestEnd, "h:mm a")}`,
      }).catch(() => {});
    }

    return NextResponse.json({
      uid: newBooking.uid,
      status: newBooking.status,
    });
  } catch (error) {
    console.error("Reschedule error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
