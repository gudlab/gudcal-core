const DEFAULT_FROM = "GudCal <noreply@mailman.gudcal.com>";
const DEFAULT_MAILBOX = "noreply@mailman.gudcal.com";

function rawFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

/** Mailbox used in From / ICS ORGANIZER (must stay on the verified sending domain). */
export function bookingMailbox(): string {
  const raw = rawFromAddress();
  const bracket = raw.match(/<([^>]+)>/);
  if (bracket?.[1]) return bracket[1].trim();
  if (raw.includes("@") && !raw.includes("<")) return raw;
  return DEFAULT_MAILBOX;
}

function sanitizeDisplayName(name: string): string {
  const cleaned = name.replace(/[\r\n<>]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "GudCal";
}

/**
 * Booking mail From line. Resend cannot send as the host's Gmail, so the
 * mailbox stays on the verified sending domain and the host's name is the
 * display name Gmail shows instead of an unknown personal address.
 */
export function bookingFromAddress(hostName?: string | null): string {
  const mailbox = bookingMailbox();
  const name = sanitizeDisplayName(hostName ?? "");
  if (name === "GudCal") return `GudCal <${mailbox}>`;
  const quoted = /[,;:"\\]/.test(name) ? `"${name.replace(/"/g, '\\"')}"` : name;
  return `${quoted} via GudCal <${mailbox}>`;
}
