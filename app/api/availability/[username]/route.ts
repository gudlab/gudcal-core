import { NextResponse } from "next/server";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability";
import { getBusyTimes } from "@/lib/calendar/google";

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
    const guestTimezone =
      searchParams.get("timezone") ?? "America/New_York";

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

    // Date range - default to next 7 days
    const now = new Date();
    const startDate = dateFrom
      ? startOfDay(
          fromZonedTime(
            new Date(dateFrom + "T00:00:00"),
            availability.timezone,
          ),
        )
      : startOfDay(now);
    const endDate = dateTo
      ? endOfDay(
          fromZonedTime(
            new Date(dateTo + "T23:59:59"),
            availability.timezone,
          ),
        )
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

    // Fetch busy times from Google Calendar (returns [] if no connection)
    const busyTimes = await getBusyTimes(user.id, startDate, endDate);

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

    // Return structured response with date-grouped slots
    const slots = daySlots.map((day) => ({
      date: day.date,
      slots: day.slots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      })),
    }));

    return NextResponse.json({ slots, timezone: guestTimezone });
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
