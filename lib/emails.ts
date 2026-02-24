import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { resend } from "@/lib/email";
import { env } from "@/env.mjs";

import BookingConfirmationEmail from "@/emails/booking-confirmation";
import BookingCancellationEmail from "@/emails/booking-cancellation";
import BookingReminderEmail from "@/emails/booking-reminder";
import BookingRescheduledEmail from "@/emails/booking-rescheduled";
import PasswordResetEmail from "@/emails/password-reset";

const FROM_EMAIL = process.env.EMAIL_FROM ?? "GudCal <noreply@mailman.gudcal.com>";

export interface BookingEmailData {
  guestName: string;
  guestEmail: string;
  hostName: string;
  hostEmail: string;
  eventTitle: string;
  dateStr: string;
  timeStr: string;
  location?: string;
  bookingUid: string;
  notes?: string;
  cancelReason?: string;
  additionalGuestEmails?: string[];
}

export interface RescheduleEmailData extends BookingEmailData {
  oldDateStr: string;
  oldTimeStr: string;
}

/**
 * Build BookingEmailData from a booking record with included relations.
 * Avoids duplicating date formatting logic across multiple call sites.
 */
/**
 * Parse the additionalGuests JSON field into an array of email addresses.
 */
function parseAdditionalGuestEmails(
  additionalGuests: unknown,
): string[] {
  if (!additionalGuests || !Array.isArray(additionalGuests)) return [];
  return additionalGuests
    .filter(
      (g): g is { email: string } =>
        typeof g === "object" && g !== null && "email" in g && typeof (g as any).email === "string",
    )
    .map((g) => g.email);
}

export function buildBookingEmailData(booking: {
  uid: string;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  startTime: Date;
  endTime: Date;
  notes?: string | null;
  cancelReason?: string | null;
  location?: string | null;
  additionalGuests?: unknown;
  eventType: {
    title: string;
    locationValue?: string | null;
  };
  host: {
    name?: string | null;
    email?: string | null;
  };
}): BookingEmailData {
  const guestStart = toZonedTime(booking.startTime, booking.guestTimezone);
  const guestEnd = toZonedTime(booking.endTime, booking.guestTimezone);

  const additionalGuestEmails = parseAdditionalGuestEmails(booking.additionalGuests);

  return {
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    hostName: booking.host.name ?? "Host",
    hostEmail: booking.host.email ?? "",
    eventTitle: booking.eventType.title,
    dateStr: format(guestStart, "EEEE, MMMM d, yyyy"),
    timeStr: `${format(guestStart, "h:mm a")} - ${format(guestEnd, "h:mm a")}`,
    location: booking.location ?? booking.eventType.locationValue ?? undefined,
    bookingUid: booking.uid,
    notes: booking.notes ?? undefined,
    cancelReason: booking.cancelReason ?? undefined,
    ...(additionalGuestEmails.length > 0 && { additionalGuestEmails }),
  };
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  const { guestEmail, hostEmail, additionalGuestEmails, ...rest } = data;

  try {
    // Send to guest (CC additional guests)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: guestEmail,
      ...(additionalGuestEmails?.length && { cc: additionalGuestEmails }),
      subject: `Booking confirmed: ${data.eventTitle} with ${data.hostName}`,
      react: BookingConfirmationEmail({ ...rest, isHost: false }),
    });

    // Send to host
    await resend.emails.send({
      from: FROM_EMAIL,
      to: hostEmail,
      subject: `New booking: ${data.guestName} booked ${data.eventTitle}`,
      react: BookingConfirmationEmail({ ...rest, isHost: true }),
    });
  } catch (error) {
    console.error("Error sending booking confirmation:", error);
  }
}

export async function sendBookingCancellation(data: BookingEmailData) {
  const { guestEmail, hostEmail, cancelReason, additionalGuestEmails, ...rest } = data;

  try {
    // Send to guest (CC additional guests)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: guestEmail,
      ...(additionalGuestEmails?.length && { cc: additionalGuestEmails }),
      subject: `Booking cancelled: ${data.eventTitle}`,
      react: BookingCancellationEmail({ ...rest, cancelReason, isHost: false }),
    });

    // Send to host
    await resend.emails.send({
      from: FROM_EMAIL,
      to: hostEmail,
      subject: `Booking cancelled: ${data.guestName} - ${data.eventTitle}`,
      react: BookingCancellationEmail({ ...rest, cancelReason, isHost: true }),
    });
  } catch (error) {
    console.error("Error sending booking cancellation:", error);
  }
}

export async function sendPasswordResetEmail({
  email,
  firstName,
  resetUrl,
}: {
  email: string;
  firstName: string;
  resetUrl: string;
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your GudCal password",
      react: PasswordResetEmail({ firstName, resetUrl }),
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);
  }
}

export async function sendBookingReminder(data: Omit<BookingEmailData, "cancelReason">) {
  const { guestEmail, additionalGuestEmails, ...rest } = data;

  try {
    // Send to guest (CC additional guests)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: guestEmail,
      ...(additionalGuestEmails?.length && { cc: additionalGuestEmails }),
      subject: `Reminder: ${data.eventTitle} with ${data.hostName} tomorrow`,
      react: BookingReminderEmail({ ...rest }),
    });
  } catch (error) {
    console.error("Error sending booking reminder:", error);
  }
}

export async function sendBookingRescheduled(data: RescheduleEmailData) {
  const { guestEmail, hostEmail, additionalGuestEmails, ...rest } = data;

  try {
    // Send to guest (CC additional guests)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: guestEmail,
      ...(additionalGuestEmails?.length && { cc: additionalGuestEmails }),
      subject: `Booking rescheduled: ${data.eventTitle} with ${data.hostName}`,
      react: BookingRescheduledEmail({ ...rest, isHost: false }),
    });

    // Send to host
    await resend.emails.send({
      from: FROM_EMAIL,
      to: hostEmail,
      subject: `Booking rescheduled: ${data.guestName} - ${data.eventTitle}`,
      react: BookingRescheduledEmail({ ...rest, isHost: true }),
    });
  } catch (error) {
    console.error("Error sending booking rescheduled email:", error);
  }
}
