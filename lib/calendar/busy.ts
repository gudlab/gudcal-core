import { addMinutes, areIntervalsOverlapping } from "date-fns";

export interface BusyInterval {
  start: Date;
  end: Date;
}

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

/**
 * Google freebusy calendar payload. Errors are distinct from an empty busy list.
 */
export function parseGoogleFreeBusy(
  data: {
    calendars?: Record<
      string,
      {
        busy?: Array<{ start?: string | null; end?: string | null }>;
        errors?: Array<{ reason?: string | null; domain?: string | null }>;
      }
    >;
  },
  calendarId: string,
): BusyInterval[] {
  const calendar = data.calendars?.[calendarId];
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
  query: () => Promise<{ data: Parameters<typeof parseGoogleFreeBusy>[0] }>,
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

export function excludeOverlappingBusy(
  busyPeriods: BusyInterval[],
  ignore: BusyInterval | undefined,
): BusyInterval[] {
  if (!ignore) return busyPeriods;
  return busyPeriods.filter(
    (busy) =>
      !areIntervalsOverlapping(
        { start: busy.start, end: busy.end },
        { start: ignore.start, end: ignore.end },
      ),
  );
}

/**
 * Busy times from every connected calendar for this host.
 * Google is the only provider today. No connection → []. Lookup failure throws.
 */
export async function getAllBusyTimes(
  userId: string,
  from: Date,
  to: Date,
): Promise<BusyInterval[]> {
  const { getBusyTimes } = await import("./google");
  return getBusyTimes(userId, from, to);
}

/** Reads fail open: log a warning and treat the host as having no external busy. */
export async function getBusyTimesForRead(
  userId: string,
  from: Date,
  to: Date,
  lookup: BusyLookup = getAllBusyTimes,
): Promise<BusyInterval[]> {
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

export async function checkWriteAgainstCalendarBusy(
  params: {
    userId: string;
    start: Date;
    end: Date;
    bufferBefore?: number;
    bufferAfter?: number;
    /** Reschedule: ignore the Google event that occupies the original slot. */
    ignoreBusyOverlapping?: BusyInterval;
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

  const relevantBusy = excludeOverlappingBusy(
    busy,
    params.ignoreBusyOverlapping,
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
