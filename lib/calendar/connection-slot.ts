import type { CalendarProvider } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/db";
import {
  canConsumeConnectionSlot,
  isReconnectOfExisting,
} from "@/lib/calendar/connection-policy";
import { maxCalendarConnections } from "@/lib/self-host";

type CalendarSlotEmail = string | null;
type CalendarSlotOptions = { preOAuth: true };

/**
 * Reconnecting the same Google email is always allowed.
 * A new account consumes a slot. Self-host is uncapped (`-1`).
 *
 * Connect routes pass `{ preOAuth: true }` (no email yet): the check
 * passes if the user already has a row for that provider, so reconnect
 * at a cap is not blocked before OAuth. saveCalendarConnection always
 * passes `email` (possibly null). A null email is not a reconnect.
 */
export async function requireCalendarConnectionSlot(
  userId: string,
  provider: CalendarProvider,
  emailOrOptions?: CalendarSlotEmail | CalendarSlotOptions,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const existing = await prisma.calendarConnection.findMany({
    where: { userId },
    select: { provider: true, email: true },
  });
  const preOAuth =
    typeof emailOrOptions === "object" &&
    emailOrOptions !== null &&
    "preOAuth" in emailOrOptions &&
    emailOrOptions.preOAuth === true;
  const email: CalendarSlotEmail | undefined = preOAuth
    ? undefined
    : (emailOrOptions as CalendarSlotEmail | undefined);

  if (preOAuth && existing.some((c) => c.provider === provider)) {
    return { ok: true };
  }
  if (isReconnectOfExisting(existing, provider, email)) {
    return { ok: true };
  }

  const allowed = canConsumeConnectionSlot(
    existing.length,
    maxCalendarConnections(),
    false,
  );
  if (allowed) return { ok: true };
  return {
    ok: false,
    message: "You have reached the calendar connection limit for this instance.",
  };
}
