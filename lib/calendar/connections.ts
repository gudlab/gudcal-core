import type {
  CalendarConnection,
  CalendarProvider,
} from "@/app/generated/prisma/client";

import { prisma } from "@/lib/db";
import { requireCalendarConnectionSlot } from "@/lib/calendar/connection-slot";
import {
  WRITE_CALENDAR_PROVIDERS,
  isReconnectOfExisting,
  normalizeCalendarEmail,
} from "@/lib/calendar/connection-policy";

export const EVENT_CONNECTION_ORDER_BY = [
  { isPrimary: "desc" as const },
  { createdAt: "asc" as const },
  { id: "asc" as const },
];

export class CalendarLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarLimitError";
  }
}

export type CalendarAccountInput = {
  userId: string;
  provider: CalendarProvider;
  email: string | null;
  calendarId?: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
};

function isWritableProvider(provider: CalendarProvider): boolean {
  return WRITE_CALENDAR_PROVIDERS.includes(provider);
}

export async function findExistingCalendarConnection(
  userId: string,
  provider: CalendarProvider,
  email?: string | null,
): Promise<CalendarConnection | null> {
  const target = normalizeCalendarEmail(email);
  if (!target) return null;
  const rows = await prisma.calendarConnection.findMany({
    where: { userId, provider },
  });
  return (
    rows.find((row) => normalizeCalendarEmail(row.email) === target) ?? null
  );
}

/** Same-provider rows for event UPDATE/DELETE, primary first. */
export async function listSameProviderConnectionsForEvent(
  userId: string,
  provider: Extract<CalendarProvider, "GOOGLE">,
): Promise<CalendarConnection[]> {
  return prisma.calendarConnection.findMany({
    where: { userId, provider },
    orderBy: EVENT_CONNECTION_ORDER_BY,
  });
}

/**
 * Persist OAuth tokens. Same-account reconnects update the existing row
 * (calendar pick / primary flags stay put). New accounts consume a slot
 * and become primary only when the user has no writable primary yet.
 */
export async function saveCalendarConnection(
  input: CalendarAccountInput,
): Promise<CalendarConnection> {
  const email = normalizeCalendarEmail(input.email);
  const existingRows = await prisma.calendarConnection.findMany({
    where: { userId: input.userId },
    select: { id: true, provider: true, email: true },
  });

  const reconnect = isReconnectOfExisting(
    existingRows,
    input.provider,
    email,
  );

  if (reconnect) {
    const existing = await findExistingCalendarConnection(
      input.userId,
      input.provider,
      email,
    );
    if (existing) {
      return prisma.calendarConnection.update({
        where: { id: existing.id },
        data: {
          accessToken: input.accessToken,
          refreshToken: input.refreshToken ?? undefined,
          expiresAt: input.expiresAt,
          email,
        },
      });
    }
  }

  const slot = await requireCalendarConnectionSlot(
    input.userId,
    input.provider,
    email,
  );
  if (!slot.ok) {
    throw new CalendarLimitError(slot.message);
  }

  const writable = isWritableProvider(input.provider);
  const existingPrimary = writable
    ? await prisma.calendarConnection.findFirst({
        where: {
          userId: input.userId,
          isPrimary: true,
          provider: { in: WRITE_CALENDAR_PROVIDERS },
        },
        select: { id: true },
        orderBy: [
          { isPrimary: "desc" },
          { createdAt: "asc" },
          { provider: "asc" },
          { id: "asc" },
        ],
      })
    : null;

  return prisma.calendarConnection.create({
    data: {
      userId: input.userId,
      provider: input.provider,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      email,
      calendarId: input.calendarId ?? email,
      isPrimary: writable && !existingPrimary,
      includeInBusyCheck: writable,
    },
  });
}

/** The single Google connection that receives writes. */
export async function getPrimaryWriteConnection(
  userId: string,
): Promise<CalendarConnection | null> {
  return prisma.calendarConnection.findFirst({
    where: { userId, provider: { in: WRITE_CALENDAR_PROVIDERS } },
    orderBy: [
      { isPrimary: "desc" },
      { createdAt: "asc" },
      { provider: "asc" },
      { id: "asc" },
    ],
  });
}

export async function getCalendarConnectionForUser(
  userId: string,
  connectionId: string,
): Promise<CalendarConnection | null> {
  return prisma.calendarConnection.findFirst({
    where: { id: connectionId, userId },
  });
}

export async function setPrimaryCalendarConnection(
  userId: string,
  connectionId: string,
): Promise<void> {
  const connection = await prisma.calendarConnection.findFirst({
    where: {
      id: connectionId,
      userId,
      provider: { in: WRITE_CALENDAR_PROVIDERS },
    },
    select: { id: true },
  });
  if (!connection) {
    throw new Error("Calendar connection not found");
  }

  await prisma.$transaction([
    prisma.calendarConnection.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.calendarConnection.update({
      where: { id: connectionId },
      data: { isPrimary: true },
    }),
  ]);
}

export async function updateCalendarConnectionSettings(
  userId: string,
  connectionId: string,
  data: { calendarId?: string; includeInBusyCheck?: boolean },
): Promise<void> {
  const connection = await prisma.calendarConnection.findFirst({
    where: {
      id: connectionId,
      userId,
      provider: { in: WRITE_CALENDAR_PROVIDERS },
    },
    select: { id: true },
  });
  if (!connection) {
    throw new Error("Calendar connection not found");
  }

  await prisma.calendarConnection.update({
    where: { id: connectionId },
    data,
  });
}

export async function disconnectCalendarConnection(
  userId: string,
  connectionId: string,
): Promise<void> {
  const connection = await prisma.calendarConnection.findFirst({
    where: { id: connectionId, userId },
  });
  if (!connection) return;

  const wasPrimary = connection.isPrimary;
  await prisma.calendarConnection.delete({ where: { id: connectionId } });

  if (wasPrimary) {
    await promotePrimaryCalendar(userId);
  }
}

async function promotePrimaryCalendar(userId: string): Promise<void> {
  const remaining = await prisma.calendarConnection.findFirst({
    where: { userId, provider: { in: WRITE_CALENDAR_PROVIDERS } },
    orderBy: [
      { isPrimary: "desc" },
      { createdAt: "asc" },
      { provider: "asc" },
      { id: "asc" },
    ],
  });
  if (!remaining) return;

  await prisma.calendarConnection.update({
    where: { id: remaining.id },
    data: { isPrimary: true },
  });
}
