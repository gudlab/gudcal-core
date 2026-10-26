import { addDays, addMinutes, eachDayOfInterval, startOfWeek } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

import {
  civilDateFromInstant,
  formatDateKey,
  zonedEndOfDay,
  zonedStartOfDay,
  zonedYmd,
} from "@/lib/booking-dates";

export type WorkingRule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

function parseHm(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

export function zonedDateKey(date: Date, timezone: string): string {
  return civilDateFromInstant(date.toISOString(), timezone);
}

export function monthGridDays(
  cursor: Date,
  timezone: string,
  weekStartsOn: 0 | 1,
): Date[] {
  const { year, month } = zonedYmd(cursor, timezone);
  const first = zonedStartOfDay(formatDateKey(year, month, 1), timezone);
  const firstLocal = toZonedTime(first, timezone);
  const gridStart = startOfWeek(firstLocal, { weekStartsOn });
  const startUtc = fromZonedTime(gridStart, timezone);
  return Array.from({ length: 42 }, (_, i) => addDays(startUtc, i));
}

export function weekDays(
  cursor: Date,
  timezone: string,
  weekStartsOn: 0 | 1,
): Date[] {
  const local = toZonedTime(cursor, timezone);
  const startLocal = startOfWeek(local, { weekStartsOn });
  const startUtc = fromZonedTime(startLocal, timezone);
  return Array.from({ length: 7 }, (_, i) => addDays(startUtc, i));
}

export function workingWindowsForDate(
  date: Date,
  rules: WorkingRule[],
  timezone: string,
): { start: Date; end: Date }[] {
  const local = toZonedTime(date, timezone);
  const dayRules = rules.filter((rule) => rule.dayOfWeek === local.getDay());
  const dateKey = zonedDateKey(date, timezone);

  return dayRules.map((rule) => {
    const start = parseHm(rule.startTime);
    const end = parseHm(rule.endTime);
    const dayStart = zonedStartOfDay(dateKey, timezone);
    return {
      start: addMinutes(dayStart, start.hours * 60 + start.minutes),
      end: addMinutes(dayStart, end.hours * 60 + end.minutes),
    };
  });
}

export function isWorkingDay(
  date: Date,
  rules: WorkingRule[],
  timezone: string,
): boolean {
  return workingWindowsForDate(date, rules, timezone).length > 0;
}

export function rangeOverlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function dayBounds(date: Date, timezone: string): { start: Date; end: Date } {
  const key = zonedDateKey(date, timezone);
  return {
    start: zonedStartOfDay(key, timezone),
    end: zonedEndOfDay(key, timezone),
  };
}

export function itemsOnDay<T extends { start: Date; end: Date }>(
  date: Date,
  items: T[],
  timezone: string,
): T[] {
  const { start, end } = dayBounds(date, timezone);
  return items.filter((item) => rangeOverlaps(item.start, item.end, start, end));
}

export function eachDateKeyInRange(
  start: Date,
  end: Date,
  timezone: string,
): string[] {
  const startKey = zonedDateKey(start, timezone);
  const endKey = zonedDateKey(end, timezone);
  const days = eachDayOfInterval({
    start: zonedStartOfDay(startKey, timezone),
    end: zonedStartOfDay(endKey, timezone),
  });
  return days.map((day) => zonedDateKey(day, timezone));
}
