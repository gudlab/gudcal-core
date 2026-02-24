import {
  addMinutes,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  format,
  parseISO,
  isAfter,
  isBefore,
  areIntervalsOverlapping,
  addDays,
  setHours,
  setMinutes,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// ─── Types ───────────────────────────────────────────────

export interface TimeSlot {
  start: Date; // UTC
  end: Date; // UTC
}

export interface AvailabilityRule {
  dayOfWeek: number;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface DateOverride {
  date: string; // "YYYY-MM-DD"
  startTime: string | null;
  endTime: string | null;
  isBlocked: boolean;
}

export interface BusyTime {
  start: Date;
  end: Date;
}

export interface GetAvailableSlotsParams {
  // Date range to check (UTC)
  startDate: Date;
  endDate: Date;
  // Event config
  duration: number; // minutes
  slotInterval?: number; // minutes; defaults to duration
  bufferBefore: number; // minutes
  bufferAfter: number; // minutes
  minimumNotice: number; // minutes from now
  maxBookingsPerDay?: number | null;
  // Availability
  rules: AvailabilityRule[];
  dateOverrides: DateOverride[];
  hostTimezone: string;
  // Existing commitments
  busyTimes: BusyTime[];
  existingBookings: { start: Date; end: Date }[];
  // For display
  guestTimezone?: string;
}

export interface DayAvailability {
  date: string; // "YYYY-MM-DD"
  slots: TimeSlot[];
}

// ─── Internal helpers ────────────────────────────────────

/**
 * Parse "HH:mm" string into hours and minutes
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

/**
 * Get available time windows for a specific date based on rules/overrides.
 * Returns time windows in UTC.
 */
function getTimeWindowsForDate(
  date: Date,
  rules: AvailabilityRule[],
  dateOverrides: DateOverride[],
  hostTimezone: string,
): TimeSlot[] {
  const dateStr = format(toZonedTime(date, hostTimezone), "yyyy-MM-dd");

  // Check for date override first
  const override = dateOverrides.find((o) => o.date === dateStr);

  if (override) {
    if (override.isBlocked) return [];
    if (override.startTime && override.endTime) {
      const start = parseTime(override.startTime);
      const end = parseTime(override.endTime);
      // Create date in host timezone, then convert to UTC
      const zonedDate = toZonedTime(date, hostTimezone);
      const dayStart = startOfDay(zonedDate);
      const utcStart = fromZonedTime(
        addMinutes(dayStart, start.hours * 60 + start.minutes),
        hostTimezone,
      );
      const utcEnd = fromZonedTime(
        addMinutes(dayStart, end.hours * 60 + end.minutes),
        hostTimezone,
      );
      return [{ start: utcStart, end: utcEnd }];
    }
    return [];
  }

  // Get regular rules for this day of week
  const zonedDate = toZonedTime(date, hostTimezone);
  const dayOfWeek = zonedDate.getDay();
  const dayRules = rules.filter((r) => r.dayOfWeek === dayOfWeek);

  if (dayRules.length === 0) return [];

  const dayStart = startOfDay(zonedDate);

  return dayRules.map((rule) => {
    const start = parseTime(rule.startTime);
    const end = parseTime(rule.endTime);
    return {
      start: fromZonedTime(
        addMinutes(dayStart, start.hours * 60 + start.minutes),
        hostTimezone,
      ),
      end: fromZonedTime(
        addMinutes(dayStart, end.hours * 60 + end.minutes),
        hostTimezone,
      ),
    };
  });
}

/**
 * Generate candidate slots within a time window
 */
function generateSlots(
  window: TimeSlot,
  duration: number,
  interval: number,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let current = window.start;

  while (true) {
    const slotEnd = addMinutes(current, duration);
    if (isAfter(slotEnd, window.end)) break;
    slots.push({ start: current, end: slotEnd });
    current = addMinutes(current, interval);
  }

  return slots;
}

/**
 * Check if a slot overlaps with any busy period (with buffers applied).
 * Buffers expand the BUSY PERIOD, not the candidate slot, so that a slot
 * starting exactly when a booking ends is correctly blocked when a
 * bufferAfter is configured.
 */
function isSlotFree(
  slot: TimeSlot,
  bufferBefore: number,
  bufferAfter: number,
  busyPeriods: BusyTime[],
): boolean {
  return !busyPeriods.some((busy) =>
    areIntervalsOverlapping(
      { start: slot.start, end: slot.end },
      {
        start: addMinutes(busy.start, -bufferBefore),
        end: addMinutes(busy.end, bufferAfter),
      },
    ),
  );
}

// ─── Main function ───────────────────────────────────────

/**
 * Main function: Get available time slots for a date range.
 *
 * This is a PURE function — it does not hit the database. All data
 * (rules, overrides, busy times, existing bookings) is passed in as
 * parameters so the caller can fetch however it likes.
 *
 * All times stored in UTC; availability rules in host's timezone.
 */
export function getAvailableSlots(
  params: GetAvailableSlotsParams,
): DayAvailability[] {
  const {
    startDate,
    endDate,
    duration,
    slotInterval,
    bufferBefore,
    bufferAfter,
    minimumNotice,
    maxBookingsPerDay,
    rules,
    dateOverrides,
    hostTimezone,
    busyTimes,
    existingBookings,
    guestTimezone,
  } = params;

  const interval = slotInterval ?? duration;
  const now = new Date();
  const earliestStart = addMinutes(now, minimumNotice);

  // Combine busy times and existing bookings
  const allBusyPeriods: BusyTime[] = [
    ...busyTimes,
    ...existingBookings.map((b) => ({ start: b.start, end: b.end })),
  ];

  // Count existing bookings per day (in host timezone)
  const bookingsPerDay = new Map<string, number>();
  existingBookings.forEach((booking) => {
    const dayStr = format(
      toZonedTime(booking.start, hostTimezone),
      "yyyy-MM-dd",
    );
    bookingsPerDay.set(dayStr, (bookingsPerDay.get(dayStr) ?? 0) + 1);
  });

  // Iterate over each day in the range
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const result: DayAvailability[] = [];

  for (const day of days) {
    const dateStr = format(toZonedTime(day, hostTimezone), "yyyy-MM-dd");

    // Check max bookings per day
    if (maxBookingsPerDay != null) {
      const currentCount = bookingsPerDay.get(dateStr) ?? 0;
      if (currentCount >= maxBookingsPerDay) {
        result.push({ date: dateStr, slots: [] });
        continue;
      }
    }

    // Get available time windows for this day
    const windows = getTimeWindowsForDate(
      day,
      rules,
      dateOverrides,
      hostTimezone,
    );

    // Generate slots for each window
    const daySlots: TimeSlot[] = [];
    for (const window of windows) {
      const candidates = generateSlots(window, duration, interval);

      // Filter: minimum notice
      const afterNotice = candidates.filter((s) =>
        isAfter(s.start, earliestStart),
      );

      // Filter: not overlapping with busy periods
      const available = afterNotice.filter((s) =>
        isSlotFree(s, bufferBefore, bufferAfter, allBusyPeriods),
      );

      daySlots.push(...available);
    }

    result.push({ date: dateStr, slots: daySlots });
  }

  return result;
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * Helper: Get available dates (days that have at least one slot)
 * Used for calendar UI to disable unavailable dates
 */
export function getAvailableDates(availability: DayAvailability[]): string[] {
  return availability
    .filter((day) => day.slots.length > 0)
    .map((day) => day.date);
}

/**
 * Helper: Format a slot for display in guest's timezone
 */
export function formatSlotForDisplay(
  slot: TimeSlot,
  guestTimezone: string,
): { time: string; date: string } {
  const zonedStart = toZonedTime(slot.start, guestTimezone);
  return {
    time: format(zonedStart, "h:mm a"),
    date: format(zonedStart, "yyyy-MM-dd"),
  };
}
