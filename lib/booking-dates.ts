/**
 * Civil-date helpers for the public booking calendar.
 *
 * Date keys are always `YYYY-MM-DD` strings that mean a calendar day, not a
 * UTC instant. `new Date("YYYY-MM-DD")` is UTC midnight, so formatting that
 * Date in a west-of-UTC timezone rolls the label back one day (GudCal #15).
 */

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDateKey(
  year: number,
  monthIndex: number,
  day: number,
): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateKey(
  dateKey: string,
): { year: number; monthIndex: number; day: number } {
  const match = DATE_KEY.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

/** Shift a YYYY-MM-DD key by a whole number of calendar days. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const { year, monthIndex, day } = parseDateKey(dateKey);
  const utc = new Date(Date.UTC(year, monthIndex, day + days));
  return formatDateKey(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate(),
  );
}

/**
 * Format a date key as a weekday + long date.
 * Ignores timezone on purpose: a civil date has one label worldwide.
 */
export function formatDisplayDate(dateKey: string, _timeZone?: string): string {
  const { year, monthIndex, day } = parseDateKey(dateKey);
  const utc = new Date(Date.UTC(year, monthIndex, day));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(utc);
}

export function formatDisplayTime(isoString: string, timeZone: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  const found = parts.find((p) => p.type === type);
  if (!found) {
    throw new Error(`Missing ${type} in formatted date`);
  }
  return found.value;
}

/** Calendar Y-M-D of an instant in `timeZone`. Month is 0-based. */
export function zonedYmd(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  return {
    year: Number(part(parts, "year")),
    month: Number(part(parts, "month")) - 1,
    day: Number(part(parts, "day")),
  };
}

/** YYYY-MM-DD of an instant in `timeZone`. */
export function civilDateFromInstant(isoString: string, timeZone: string): string {
  const { year, month, day } = zonedYmd(new Date(isoString), timeZone);
  return formatDateKey(year, month, day);
}

export interface InstantSlot {
  start: string;
  end?: string;
}

export interface GuestDaySlots<T extends InstantSlot> {
  date: string;
  slots: T[];
}

/**
 * Re-bucket slots by the guest's calendar day.
 * Availability APIs may group by host timezone; the booking grid is guest-local.
 */
export function groupSlotsByGuestDate<T extends InstantSlot>(
  days: { date: string; slots: T[] }[],
  timeZone: string,
): GuestDaySlots<T>[] {
  const byDate = new Map<string, T[]>();
  for (const day of days) {
    for (const slot of day.slots) {
      const guestDate = civilDateFromInstant(slot.start, timeZone);
      const list = byDate.get(guestDate) ?? [];
      list.push(slot);
      byDate.set(guestDate, list);
    }
  }

  const dates = Array.from(byDate.keys()).sort();
  return dates.map((date) => ({
    date,
    slots: (byDate.get(date) ?? []).sort((a, b) =>
      a.start.localeCompare(b.start),
    ),
  }));
}
