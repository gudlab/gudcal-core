import { addMinutes, areIntervalsOverlapping } from "date-fns";

import { prisma } from "@/lib/db";
import {
  mergeBusyIntervals,
  type BusyInterval,
} from "@/lib/calendar/connection-policy";
import {
  timeOffOverlapWhere,
  timeOffsToBusyIntervals,
} from "@/lib/time-off";

export type { BusyInterval };
export { mergeBusyIntervals };

export class CalendarBusyLookupError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "CalendarBusyLookupError";
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export const SLOT_UNAVAILABLE_ERROR = "This time slot is no longer available";
export const CALENDAR_LOOKUP_UNAVAILABLE_ERROR =
  "Calendar availability could not be verified. Try again shortly.";

export type BusyLookup = (
  userId: string,
  from: Date,
  to: Date,
) => Promise<BusyInterval[]>;

export type WriteBusyCheckResult =
  | { ok: true }
  | { ok: false; status: 409; error: string }
  | { ok: false; status: 503; error: string };

export type GoogleFreeBusyData = {
  // googleapis types `calendars` as `T | null`, not only optional.
  calendars?: Record<
    string,
    {
      busy?: Array<{ start?: string | null; end?: string | null }>;
      errors?: Array<{ reason?: string | null; domain?: string | null }>;
    }
  > | null;
};

/**
 * Google freebusy calendar payload. Errors are distinct from an empty busy list.
 */
export function parseGoogleFreeBusy(
  data: GoogleFreeBusyData,
  calendarId: string,
): BusyInterval[] {
  const calendars = data.calendars ?? undefined;
  const calendar = calendars?.[calendarId];
  if (!calendar) {
    throw new CalendarBusyLookupError(
      `Google free/busy response did not include calendar "${calendarId}"`,
    );
  }

  if (calendar.errors?.length) {
    const reasons = calendar.errors
      .map((entry) => entry.reason ?? entry.domain ?? "unknown")
      .join(", ");
    throw new CalendarBusyLookupError(
      `Google free/busy returned errors: ${reasons}`,
    );
  }

  return (calendar.busy ?? [])
    .filter((block) => block.start && block.end)
    .map((block) => ({
      start: new Date(block.start!),
      end: new Date(block.end!),
    }));
}

/**
 * Resolve Google busy intervals from a connection + query.
 * No connection → empty list. Connected but query/parse failure → throw.
 */
export async function queryGoogleBusyTimes(
  connection: { calendarId: string | null } | null,
  query: () => Promise<{ data: GoogleFreeBusyData }>,
): Promise<BusyInterval[]> {
  if (!connection) return [];
  if (!connection.calendarId) {
    throw new CalendarBusyLookupError(
      "Google Calendar is connected but has no calendar ID",
    );
  }

  try {
    const response = await query();
    return parseGoogleFreeBusy(response.data, connection.calendarId);
  } catch (error) {
    if (error instanceof CalendarBusyLookupError) throw error;
    throw new CalendarBusyLookupError(
      "Failed to fetch Google Calendar busy times",
      { cause: error },
    );
  }
}

export function slotOverlapsBusy(
  slot: BusyInterval,
  busyPeriods: BusyInterval[],
  bufferBefore = 0,
  bufferAfter = 0,
): boolean {
  return busyPeriods.some((busy) =>
    areIntervalsOverlapping(
      { start: slot.start, end: slot.end },
      {
        start: addMinutes(busy.start, -bufferBefore),
        end: addMinutes(busy.end, bufferAfter),
      },
    ),
  );
}

/**
 * Drop only the GudCal-created event for the booking being rescheduled.
 *
 * Free/busy has no event ids, so we match the original booking's exact
 * start/end (the times GudCal wrote). A larger or partial overlap is some
 * other Google event and must stay busy.
 */
export function excludeExactBusyInterval(
  busyPeriods: BusyInterval[],
  ignore: BusyInterval | undefined,
): BusyInterval[] {
  if (!ignore) return busyPeriods;
  const ignoreStart = ignore.start.getTime();
  const ignoreEnd = ignore.end.getTime();
  return busyPeriods.filter(
    (busy) =>
      busy.start.getTime() !== ignoreStart || busy.end.getTime() !== ignoreEnd,
  );
}

/**
 * User-level TimeOff ranges. Same overlap rule as calendar busy times.
 */
export async function getTimeOffBusyTimes(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<BusyInterval[]> {
  const rows = await prisma.timeOff.findMany({
    where: timeOffOverlapWhere(userId, startDate, endDate),
    select: { startAt: true, endAt: true },
  });
  return timeOffsToBusyIntervals(rows);
}

/**
 * Busy times from every selected Google connection plus TimeOff.
 * Google is the only provider. Fail-closed: if any selected calendar
 * cannot be queried, throws. No selected connections → TimeOff only.
 */
export async function getAllBusyTimes(
  userId: string,
  from: Date,
  to: Date,
): Promise<BusyInterval[]> {
  const { getBusyTimes } = await import("./google");
  const timeOffBusy = await getTimeOffBusyTimes(userId, from, to);
  const googleBusy = await getBusyTimes(userId, from, to);
  return mergeBusyIntervals([...googleBusy, ...timeOffBusy]);
}

/**
 * Same as getAllBusyTimes, but calendar provider errors keep TimeOff busy.
 */
export async function getAllBusyTimesFailOpen(
  userId: string,
  from: Date,
  to: Date,
): Promise<BusyInterval[]> {
  const timeOffBusy = await getTimeOffBusyTimes(userId, from, to);
  try {
    const { getBusyTimes } = await import("./google");
    const googleBusy = await getBusyTimes(userId, from, to);
    return mergeBusyIntervals([...googleBusy, ...timeOffBusy]);
  } catch (error) {
    console.warn("Calendar busy time fetch failed (fail-open):", error);
    return mergeBusyIntervals(timeOffBusy);
  }
}

/**
 * Reads fail open. Injected lookups that throw return [].
 * The default path keeps TimeOff when Google cannot be queried.
 */
export async function getBusyTimesForRead(
  userId: string,
  from: Date,
  to: Date,
  lookup: BusyLookup = getAllBusyTimes,
): Promise<BusyInterval[]> {
  if (lookup !== getAllBusyTimes) {
    try {
      return await lookup(userId, from, to);
    } catch (error) {
      console.warn(
        "Calendar busy lookup failed; continuing without external busy times:",
        error,
      );
      return [];
    }
  }
  return getAllBusyTimesFailOpen(userId, from, to);
}

export async function checkWriteAgainstCalendarBusy(
  params: {
    userId: string;
    start: Date;
    end: Date;
    bufferBefore?: number;
    bufferAfter?: number;
    /** Reschedule: drop only the exact original GudCal event interval. */
    ignoreExactBusyInterval?: BusyInterval;
  },
  lookup: BusyLookup = getAllBusyTimes,
): Promise<WriteBusyCheckResult> {
  const bufferBefore = params.bufferBefore ?? 0;
  const bufferAfter = params.bufferAfter ?? 0;
  const from = addMinutes(params.start, -bufferBefore);
  const to = addMinutes(params.end, bufferAfter);

  let busy: BusyInterval[];
  try {
    busy = await lookup(params.userId, from, to);
  } catch (error) {
    if (error instanceof CalendarBusyLookupError) {
      return {
        ok: false,
        status: 503,
        error: CALENDAR_LOOKUP_UNAVAILABLE_ERROR,
      };
    }
    throw error;
  }

  const relevantBusy = excludeExactBusyInterval(
    busy,
    params.ignoreExactBusyInterval,
  );

  if (
    slotOverlapsBusy(
      { start: params.start, end: params.end },
      relevantBusy,
      bufferBefore,
      bufferAfter,
    )
  ) {
    return { ok: false, status: 409, error: SLOT_UNAVAILABLE_ERROR };
  }

  return { ok: true };
}
