import type { CalendarProvider } from "@/app/generated/prisma/client";

export const WRITE_CALENDAR_PROVIDERS: CalendarProvider[] = ["GOOGLE"];

export type BusyInterval = { start: Date; end: Date };

export type ConnectionIdentity = {
  provider: CalendarProvider | string;
  email: string | null;
};

/** Trim + lowercase calendar account emails. Empty / missing → null. */
export function normalizeCalendarEmail(
  email: string | null | undefined,
): string | null {
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Reconnecting Google is allowed only when the same account email
 * already exists for that provider — a different email is a new account.
 */
export function isReconnectOfExisting(
  existing: ConnectionIdentity[],
  provider: CalendarProvider | string,
  email?: string | null,
): boolean {
  const target = normalizeCalendarEmail(email);
  if (!target) return false;
  return existing.some(
    (c) =>
      c.provider === provider && normalizeCalendarEmail(c.email) === target,
  );
}

export type EventConnectionIdentity = {
  id: string;
  provider: CalendarProvider | string;
};

export class ProviderHttpError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Provider HTTP ${status}`);
    this.name = "ProviderHttpError";
    this.status = status;
  }
}

function numericStatus(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d{3}$/.test(value)) return Number(value);
  return undefined;
}

/** HTTP status from Google Gaxios errors or ProviderHttpError. */
export function providerHttpStatus(error: unknown): number | undefined {
  if (typeof error === "number") return numericStatus(error);
  if (!error || typeof error !== "object") return undefined;
  const e = error as {
    status?: unknown;
    code?: unknown;
    response?: { status?: unknown };
  };
  return (
    numericStatus(e.status) ??
    numericStatus(e.code) ??
    numericStatus(e.response?.status)
  );
}

export function isProviderNotFound(error: unknown): boolean {
  const status = providerHttpStatus(error);
  return status === 404 || status === 410;
}

export type TryEventConnectionResult<
  T,
  C extends EventConnectionIdentity = EventConnectionIdentity,
> =
  | { ok: true; value: T; connection: C }
  | { ok: false; reason: "no_connection" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "error"; error: unknown; connection: C };

/**
 * Try the provider's primary (isPrimary desc, then createdAt/id asc) first.
 * 404/410 fall through to the next same-provider connection. Other errors stop.
 */
export async function tryEventConnections<
  T,
  C extends EventConnectionIdentity,
>(
  connections: C[],
  attempt: (connection: C) => Promise<T>,
): Promise<TryEventConnectionResult<T, C>> {
  if (connections.length === 0) {
    return { ok: false, reason: "no_connection" };
  }

  for (const connection of connections) {
    try {
      const value = await attempt(connection);
      console.info("calendar event matched connection", {
        id: connection.id,
        provider: connection.provider,
      });
      return { ok: true, value, connection };
    } catch (error) {
      if (isProviderNotFound(error)) {
        continue;
      }
      return { ok: false, reason: "error", error, connection };
    }
  }

  console.info("calendar event not found on any connection", {
    provider: connections[0].provider,
    tried: connections.length,
  });
  return { ok: false, reason: "not_found" };
}

/** Plan limits: -1 means unlimited. Reconnects never consume a slot. */
export function canConsumeConnectionSlot(
  currentCount: number,
  maxConnections: number,
  isReconnect: boolean,
): boolean {
  if (isReconnect) return true;
  if (maxConnections === -1) return true;
  return currentCount < maxConnections;
}

export type PrimaryCandidate = {
  id: string;
  provider: CalendarProvider | string;
  isPrimary: boolean;
  createdAt: Date;
};

/**
 * Exactly one writable (Google) connection is primary (write target) per user.
 * If several rows are marked primary, prefer Google, then the oldest.
 */
export function pickPrimaryConnectionId(
  connections: PrimaryCandidate[],
): string | null {
  const writable = connections.filter((c) =>
    WRITE_CALENDAR_PROVIDERS.includes(c.provider as CalendarProvider),
  );
  if (writable.length === 0) return null;

  const marked = writable.filter((c) => c.isPrimary);
  if (marked.length === 1) return marked[0].id;
  if (marked.length > 1) {
    const google = marked.find((c) => c.provider === "GOOGLE");
    if (google) return google.id;
    return [...marked].sort(byCreatedThenId)[0].id;
  }

  return [...writable].sort(byCreatedThenId)[0].id;
}

function byCreatedThenId(a: PrimaryCandidate, b: PrimaryCandidate): number {
  const byTime = a.createdAt.getTime() - b.createdAt.getTime();
  if (byTime !== 0) return byTime;
  return a.id.localeCompare(b.id);
}

/**
 * Union of busy intervals, merging overlaps and touching ranges.
 * Adjacent ranges (end === next.start) collapse so slot math stays correct.
 */
export function mergeBusyIntervals(intervals: BusyInterval[]): BusyInterval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort(
    (a, b) =>
      a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime(),
  );

  const merged: BusyInterval[] = [
    { start: new Date(sorted[0].start), end: new Date(sorted[0].end) },
  ];

  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) {
        last.end = new Date(current.end);
      }
    } else {
      merged.push({ start: new Date(current.start), end: new Date(current.end) });
    }
  }

  return merged;
}
