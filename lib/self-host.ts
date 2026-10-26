/**
 * OSS / self-host flags. Core does not ship Stripe plan gates.
 * When NEXT_PUBLIC_IS_SELF_HOSTED is unset, treat the instance as self-hosted.
 */
export function isSelfHosted(): boolean {
  const value = process.env.NEXT_PUBLIC_IS_SELF_HOSTED;
  if (value == null || value.trim() === "") return true;
  return value.trim().toLowerCase() !== "false";
}

/** -1 means unlimited. Self-host (the default) is uncapped. */
export function maxCalendarConnections(): number {
  return isSelfHosted() ? -1 : -1;
}
