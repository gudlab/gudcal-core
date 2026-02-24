/**
 * Grouped IANA timezone list for the timezone selector.
 * Uses Intl API at runtime, but provides a curated default for SSR.
 */

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

export interface TimezoneGroup {
  label: string;
  options: TimezoneOption[];
}

/** Get the UTC offset string for a timezone, e.g. "UTC-05:00" */
function getOffset(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    return offsetPart?.value ?? "UTC";
  } catch {
    return "UTC";
  }
}

/** Format timezone name for display: "America/New_York" → "New York" */
function formatTzName(tz: string): string {
  const parts = tz.split("/");
  const city = parts[parts.length - 1];
  return city.replace(/_/g, " ");
}

/** Get region from timezone: "America/New_York" → "America" */
function getRegion(tz: string): string {
  return tz.split("/")[0];
}

/**
 * Popular timezones shown first for quick selection.
 */
export const POPULAR_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

/**
 * Get all available timezones grouped by region.
 * Falls back to a curated list if Intl.supportedValuesOf is not available.
 */
export function getGroupedTimezones(): TimezoneGroup[] {
  let timezones: string[];

  try {
    timezones = Intl.supportedValuesOf("timeZone");
  } catch {
    // Fallback for older environments
    timezones = POPULAR_TIMEZONES;
  }

  // Build popular group
  const popularGroup: TimezoneGroup = {
    label: "Popular",
    options: POPULAR_TIMEZONES.map((tz) => ({
      value: tz,
      label: formatTzName(tz),
      offset: getOffset(tz),
    })),
  };

  // Group remaining by region
  const regionMap = new Map<string, TimezoneOption[]>();

  for (const tz of timezones) {
    if (POPULAR_TIMEZONES.includes(tz)) continue; // skip dupes
    const region = getRegion(tz);
    if (!regionMap.has(region)) {
      regionMap.set(region, []);
    }
    regionMap.get(region)!.push({
      value: tz,
      label: formatTzName(tz),
      offset: getOffset(tz),
    });
  }

  const regionGroups: TimezoneGroup[] = Array.from(regionMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, options]) => ({
      label: region,
      options: options.sort((a, b) => a.label.localeCompare(b.label)),
    }));

  return [popularGroup, ...regionGroups];
}

/** Detect the user's timezone from the browser */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}
