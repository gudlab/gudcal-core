import {
  addDaysToDateKey,
  formatDateKey,
  formatDisplayDate,
  formatDisplayTime,
  groupSlotsByGuestDate,
} from "@/lib/booking-dates";

export const NO_TIMES_LEFT_TODAY = "No times left today";

/** Extra months to search when this month has no remaining slots. */
export const NEXT_AVAILABLE_LOOKAHEAD_MONTHS = 2;

export function daysInCalendarMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function addCalendarMonths(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; month: number } {
  const utc = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() };
}

/** Padded from/to for a calendar month, matching the booking widget fetch. */
export function monthAvailabilityRange(
  year: number,
  monthIndex: number,
): { from: string; to: string } {
  const firstDay = formatDateKey(year, monthIndex, 1);
  const lastDay = formatDateKey(
    year,
    monthIndex,
    daysInCalendarMonth(year, monthIndex),
  );
  return {
    from: addDaysToDateKey(firstDay, -1),
    to: addDaysToDateKey(lastDay, 1),
  };
}

export function nextAvailableDateKey(
  todayKey: string,
  availableDates: Iterable<string>,
): string | null {
  const later = Array.from(availableDates)
    .filter((date) => date > todayKey)
    .sort();
  return later[0] ?? null;
}

export type HintSlot = { time: string; dateTime: string };

export function guestDaysFromAvailability(
  days: { date: string; slots: { start: string; end?: string }[] }[],
  guestTimeZone: string,
): { dates: string[]; slotsByDate: Record<string, HintSlot[]> } {
  const grouped = groupSlotsByGuestDate(days, guestTimeZone);
  const dates: string[] = [];
  const slotsByDate: Record<string, HintSlot[]> = {};
  for (const day of grouped) {
    if (day.slots.length === 0) continue;
    dates.push(day.date);
    slotsByDate[day.date] = day.slots.map((s) => ({
      time: formatDisplayTime(s.start, guestTimeZone),
      dateTime: s.start,
    }));
  }
  return { dates, slotsByDate };
}

export function mergeDateSets(
  current: Iterable<string>,
  extra: Iterable<string>,
): string[] {
  return Array.from(
    new Set([...Array.from(current), ...Array.from(extra)]),
  ).sort();
}

/**
 * If this month has no remaining slots after today, return the next month to
 * fetch. Bounded by `maxMonthsAhead` extra months from the origin month.
 */
export function nextLookaheadMonth(input: {
  todayKey: string;
  availableDates: Iterable<string>;
  originYear: number;
  originMonth: number;
  monthsAheadFetched: number;
  maxMonthsAhead?: number;
}): { year: number; month: number } | null {
  if (nextAvailableDateKey(input.todayKey, input.availableDates)) return null;
  const max = input.maxMonthsAhead ?? NEXT_AVAILABLE_LOOKAHEAD_MONTHS;
  if (input.monthsAheadFetched >= max) return null;
  return addCalendarMonths(
    input.originYear,
    input.originMonth,
    input.monthsAheadFetched + 1,
  );
}

/** Format a slot instant as a long date in the guest timezone (may shift the civil day). */
export function formatSlotDateInTimeZone(
  isoString: string,
  timeZone: string,
): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  });
}

export function firstSlotStart(
  dateKey: string,
  slotsByDate: Record<string, Array<{ dateTime: string }>>,
): string | null {
  return slotsByDate[dateKey]?.[0]?.dateTime ?? null;
}

/**
 * When the guest's today has no remaining slots, explain it instead of
 * silently greying the day out.
 */
export function todayEmptyHint(input: {
  todayKey: string;
  availableDates: Iterable<string>;
  monthLoading?: boolean;
  viewingTodayMonth?: boolean;
  slotsByDate?: Record<string, Array<{ dateTime: string }>>;
}): {
  title: string;
  nextDateKey: string | null;
  nextSlotStart: string | null;
} | null {
  if (input.monthLoading) return null;
  if (input.viewingTodayMonth === false) return null;
  const dates = new Set(input.availableDates);
  if (dates.has(input.todayKey)) return null;
  const nextDateKey = nextAvailableDateKey(input.todayKey, dates);
  return {
    title: NO_TIMES_LEFT_TODAY,
    nextDateKey,
    nextSlotStart: nextDateKey
      ? firstSlotStart(nextDateKey, input.slotsByDate ?? {})
      : null,
  };
}

export function formatTodayEmptyMessage(
  hint: {
    title: string;
    nextDateKey: string | null;
    nextSlotStart?: string | null;
  },
  guestTimeZone?: string,
): string {
  if (!hint.nextDateKey) return hint.title;
  const label =
    hint.nextSlotStart && guestTimeZone
      ? formatSlotDateInTimeZone(hint.nextSlotStart, guestTimeZone)
      : formatDisplayDate(hint.nextDateKey, guestTimeZone);
  return `${hint.title}. Next available: ${label}`;
}
