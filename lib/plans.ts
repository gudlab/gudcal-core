/**
 * gudcal-core: All features unlocked, no plan restrictions.
 *
 * These stubs preserve the API shape used by other modules
 * (analytics page, event-type creation, etc.) while removing
 * every dependency on Stripe / the Subscription model.
 */

import { prisma } from "@/lib/db";

export type SubscriptionPlan = "FREE" | "PRO" | "TEAM";

export async function getUserPlan(_userId: string): Promise<SubscriptionPlan> {
  return "TEAM";
}

export async function getOrgPlan(_orgId: string): Promise<SubscriptionPlan> {
  return "TEAM";
}

export function getPlanLimits(_plan?: string) {
  return {
    eventTypes: Infinity,
    calendarConnections: Infinity,
    teams: Infinity,
  };
}

export async function checkEventTypeLimit(_userId: string): Promise<boolean> {
  return true; // always allowed
}

export async function checkCalendarConnectionLimit(
  _userId: string,
): Promise<boolean> {
  return true; // always allowed
}

export async function getUserUsage(userId: string) {
  const [eventTypeCount, calendarCount] = await Promise.all([
    prisma.eventType.count({ where: { userId } }),
    prisma.calendarConnection.count({ where: { userId } }),
  ]);

  return {
    plan: "TEAM" as const,
    limits: getPlanLimits(),
    usage: {
      eventTypes: eventTypeCount,
      calendarConnections: calendarCount,
    },
  };
}
