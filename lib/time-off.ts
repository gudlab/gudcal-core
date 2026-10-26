import { areIntervalsOverlapping } from "date-fns";

import type { BookingStatus } from "@/app/generated/prisma/client";
import {
  civilDateFromInstant,
  zonedEndOfDay,
  zonedStartOfDay,
} from "@/lib/booking-dates";
import type { BusyInterval } from "@/lib/calendar/connection-policy";

export const TIME_OFF_LABELS = ["HOLIDAY", "SICK", "AWAY", "OTHER"] as const;
export type TimeOffLabel = (typeof TIME_OFF_LABELS)[number];

export const TIME_OFF_LABEL_COPY: Record<TimeOffLabel, string> = {
  HOLIDAY: "Holiday",
  SICK: "Sick",
  AWAY: "Away",
  OTHER: "Other",
};

export const TIME_OFF_OVERLAP_ERROR = "This time slot overlaps with time off";

export type DateRange = { start: Date; end: Date };

export function timeOffsToBusyIntervals(
  rows: { startAt: Date; endAt: Date }[],
): BusyInterval[] {
  return rows.map((row) => ({ start: row.startAt, end: row.endAt }));
}

export function slotOverlapsBusyTimes(
  startTime: Date,
  endTime: Date,
  busyTimes: DateRange[],
): boolean {
  return busyTimes.some((busy) => busy.start < endTime && busy.end > startTime);
}

export function findOverlappingRanges<T extends DateRange>(
  range: DateRange,
  items: T[],
): T[] {
  return items.filter((item) =>
    areIntervalsOverlapping(
      { start: range.start, end: range.end },
      { start: item.start, end: item.end },
    ),
  );
}

export function resolveTimeOffRange(input: {
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  timezone: string;
}): { startAt: Date; endAt: Date } {
  if (!input.allDay) {
    if (!(input.endAt > input.startAt)) {
      throw new Error("End must be after start");
    }
    return { startAt: input.startAt, endAt: input.endAt };
  }

  const startKey = civilDateFromInstant(input.startAt.toISOString(), input.timezone);
  const endKey = civilDateFromInstant(input.endAt.toISOString(), input.timezone);
  const startAt = zonedStartOfDay(startKey, input.timezone);
  const endAt = zonedEndOfDay(endKey, input.timezone);

  if (!(endAt > startAt)) {
    throw new Error("End must be after start");
  }

  return { startAt, endAt };
}

export function timeOffOverlapWhere(userId: string, startAt: Date, endAt: Date) {
  return {
    userId,
    startAt: { lt: endAt },
    endAt: { gt: startAt },
  };
}

export function activeBookingOverlapWhere(
  userId: string,
  startAt: Date,
  endAt: Date,
) {
  return {
    userId,
    startTime: { lt: endAt },
    endTime: { gt: startAt },
    status: { in: ["CONFIRMED", "PENDING"] as BookingStatus[] },
  };
}
