/**
 * gudcal-core: All features always enabled.
 *
 * In the open-source self-hosted edition every premium feature
 * is unlocked regardless of plan. The type exports are kept so
 * existing call-sites continue to compile.
 */

export type PremiumFeature =
  | "analytics"
  | "mcp"
  | "ai"
  | "custom-domains"
  | "custom-branding"

export type SubscriptionPlan = "FREE" | "PRO" | "TEAM"

export function isFeatureEnabled(
  _feature: PremiumFeature,
  _plan: SubscriptionPlan = "FREE",
): boolean {
  return true
}

export function isSelfHosted(): boolean {
  return true
}

export function getFeaturesForPlan(
  _plan: SubscriptionPlan,
): PremiumFeature[] {
  return ["analytics", "mcp", "ai", "custom-domains", "custom-branding"]
}

export function getPlanLimits(_plan: SubscriptionPlan = "FREE") {
  return {
    maxEventTypes: -1,
    maxCalendarConnections: -1,
    maxTeamMembers: -1,
  }
}
