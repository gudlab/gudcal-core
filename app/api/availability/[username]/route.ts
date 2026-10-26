import { NextResponse } from "next/server";
import { addDays, startOfDay, endOfDay } from "date-fns";

import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability";
import { getBusyTimesForRead } from "@/lib/calendar/busy";
import {
  isDateKey,
  isoSlotsByGuestDate,
  resolveTimeZone,
  zonedEndOfDay,
  zonedStartOfDay,
} from "@/lib/booking-dates";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const { searchParams } = new URL(request.url);
    const eventSlug = searchParams.get("eventSlug");
    const singleDate = searchParams.get("date"); // YYYY-MM-DD (single day shorthand)
    const dateFrom = searchParams.get("from") ?? singleDate; // YYYY-MM-DD
    const dateTo = searchParams.get("to") ?? singleDate; // YYYY-MM-DD
    // Guest IANA zone: from/to civil dates and response day.date buckets.
    // Host availability windows still use availability.timezone internally.
    const guestTimezone = resolveTimeZone(searchParams.get("timezone"));

    if (
      (dateFrom && !isDateKey(dateFrom)) ||
      (dateTo && !isDateKey(dateTo))
    ) {
      return NextResponse.json(
        { error: "from and to must be YYYY-MM-DD" },
        { status: 400 },
      );
    }

    if (!eventSlug) {
      return NextResponse.json(
        { error: "eventSlug is required" },
        { status: 400 },
      );
    }

    // Find user and event type
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, timezone: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 },
      );
    }

    const eventType = await prisma.eventType.findFirst({
      where: { userId: user.id, slug: eventSlug, isActive: true },
      include: {
        availability: {
          include: {
            rules: true,
            dateOverrides: true,
          },
        },
      },
    });

    if (!eventType) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 },
      );
    }

    // Use event type's availability or user's default
    let availability = eventType.availability;
    if (!availability) {
      availability = await prisma.availability.findFirst({
        where: { userId: user.id, isDefault: true },
        include: { rules: true, dateOverrides: true },
      });
    }

    if (!availability) {
      return NextResponse.json(
        { error: "No availability configured" },
        { status: 400 },
      );
    }

    // Date range — civil from/to are guest-local, not host-local.
    const now = new Date();
    const startDate = dateFrom
      ? zonedStartOfDay(dateFrom, guestTimezone)
      : startOfDay(now);
    const endDate = dateTo
      ? zonedEndOfDay(dateTo, guestTimezone)
      : endOfDay(addDays(now, 6));

    // Get ALL existing bookings for this host in range (not just this event type)
    // so that buffers are respected across different event types
    const existingBookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      select: { startTime: true, endTime: true },
    });

    // External busy times (empty if no calendar is connected; fail-open on lookup error)
    const busyTimes = await getBusyTimesForRead(user.id, startDate, endDate);

    // Generate available slots (returns { date, slots: { start, end }[] }[])
    const daySlots = getAvailableSlots({
      startDate,
      endDate,
      duration: eventType.duration,
      slotInterval: eventType.slotInterval ?? undefined,
      bufferBefore: eventType.bufferBefore,
      bufferAfter: eventType.bufferAfter,
      minimumNotice: eventType.minimumNotice,
      maxBookingsPerDay: eventType.maxBookingsPerDay,
      rules: availability.rules.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
      })),
      dateOverrides: availability.dateOverrides.map((o) => ({
        date: o.date.toISOString().split("T")[0],
        startTime: o.startTime,
        endTime: o.endTime,
        isBlocked: o.isBlocked,
      })),
      hostTimezone: availability.timezone,
      busyTimes,
      existingBookings: existingBookings.map((b) => ({
        start: b.startTime,
        end: b.endTime,
      })),
      guestTimezone,
    });

    return NextResponse.json({
      slots: isoSlotsByGuestDate(daySlots, guestTimezone),
      timezone: guestTimezone,
      hostTimezone: availability.timezone,
      guestTimezone,
    });
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
