import { addMinutes, isAfter } from "date-fns";

/** Same 409 family as busy / overlap slot refusals. */
export const MINIMUM_NOTICE_ERROR =
  "This time slot is inside the minimum notice period";

export type MinimumNoticeCheckResult =
  | { ok: true }
  | { ok: false; status: 409; error: string };

/**
 * Availability already hides in-notice slots. Booking writes must re-check
 * so HTTP POST and MCP create cannot bypass the calendar.
 *
 * Matches `getAvailableSlots`: start must be strictly after now + notice.
 */
export function checkMinimumNotice(
  startTime: Date,
  minimumNoticeMinutes: number,
  now: Date = new Date(),
): MinimumNoticeCheckResult {
  const earliestStart = addMinutes(now, minimumNoticeMinutes);
  if (isAfter(startTime, earliestStart)) {
    return { ok: true };
  }
  return { ok: false, status: 409, error: MINIMUM_NOTICE_ERROR };
}

export function refuseWriteIfInsideMinimumNotice(
  startTime: Date,
  minimumNoticeMinutes: number,
  now: Date = new Date(),
): { error: string; status: 409 } | null {
  const result = checkMinimumNotice(startTime, minimumNoticeMinutes, now);
  if (result.ok) return null;
  return { error: result.error, status: result.status };
}
