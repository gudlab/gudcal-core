/** Guest cancel success UI is driven only by the booking row, never by ?cancelled=. */
export function shouldShowGuestCancelSuccess(status: string): boolean {
  return status === "CANCELLED";
}

export function shouldStripCancelledQuery(
  status: string,
  cancelledQuery?: string,
): boolean {
  const flagged = cancelledQuery === "1" || cancelledQuery === "true";
  return flagged && status !== "CANCELLED";
}
