import { z } from "zod";

const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
];

function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(lower)) return true;

  // Block private IPv4 ranges
  if (/^10\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;

  // Block link-local
  if (/^169\.254\./.test(lower)) return true;

  return false;
}

export const webhookSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .startsWith("https://", "URL must use HTTPS")
    .refine((val) => {
      try {
        const { hostname } = new URL(val);
        return !isPrivateHostname(hostname);
      } catch {
        return false;
      }
    }, "Webhook URL must not point to internal or private addresses"),
  events: z.array(z.enum([
    "BOOKING_CREATED",
    "BOOKING_CONFIRMED",
    "BOOKING_CANCELLED",
    "BOOKING_RESCHEDULED",
    "BOOKING_REMINDER",
    "MEETING_ENDED",
  ])).min(1, "Select at least one event"),
});

export type WebhookFormData = z.infer<typeof webhookSchema>;
