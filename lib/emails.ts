import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { resend } from "@/lib/email";
import { bookingFromAddress } from "@/lib/email-sender";
import {
  bookingIcsAttachment,
  buildBookingIcs,
  buildRescheduleGuestIcsEmails,
  type BookingIcsInput,
} from "@/lib/calendar/ics";
import { handleResendSendResult } from "@/lib/resend-result";

import BookingConfirmationEmail from "@/emails/booking-confirmation";
import BookingCancellationEmail from "@/emails/booking-cancellation";
import BookingReminderEmail from "@/emails/booking-reminder";
import BookingRescheduledEmail from "@/emails/booking-rescheduled";
import OAuthSignInReminderEmail from "@/emails/oauth-signin-reminder";
import PasswordResetEmail from "@/emails/password-reset";

const FROM_EMAIL = bookingFromAddress();

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
  startTime?: Date;
  endTime?: Date;
  /** Skip the ICS attach (pending bookings that are not a confirmed invite). */
  calendarInviteSent?: boolean;
}

export interface RescheduleEmailData extends BookingEmailData {
  oldDateStr: string;
  oldTimeStr: string;
  /** Confirmed original booking whose ICS UID the guest already has. */
  previousInvite?: {
    uid: string;
    startTime: Date;
    endTime: Date;
  };
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
  calendarInviteSent?: boolean;
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
    startTime: booking.startTime,
    endTime: booking.endTime,
    calendarInviteSent: booking.calendarInviteSent,
  };
}

function toBookingIcsInput(
  data: BookingEmailData,
  overrides: Partial<BookingIcsInput> = {},
): BookingIcsInput | null {
  if (!data.startTime || !data.endTime) return null;
  return {
    uid: data.bookingUid,
    title: `${data.eventTitle} with ${data.hostName}`,
    description: data.notes,
    location: data.location,
    start: data.startTime,
    end: data.endTime,
    hostName: data.hostName,
    hostEmail: data.hostEmail,
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    additionalGuests: data.additionalGuestEmails?.map((email) => ({ email })),
    ...overrides,
  };
}

function guestIcsAttachments(
  data: BookingEmailData,
  method: "REQUEST" | "CANCEL" = "REQUEST",
) {
  if (data.calendarInviteSent) return undefined;
  const input = toBookingIcsInput(data, {
    method,
    sequence: method === "CANCEL" ? 1 : 0,
  });
  if (!input) return undefined;

  const ics = buildBookingIcs(input);
  if (!ics) return undefined;
  return [bookingIcsAttachment(ics, method)];
}

function rescheduleGuestIcsEmails(data: RescheduleEmailData) {
  const previous = data.previousInvite
    ? toBookingIcsInput(
        {
          ...data,
          bookingUid: data.previousInvite.uid,
          startTime: data.previousInvite.startTime,
          endTime: data.previousInvite.endTime,
          calendarInviteSent: false,
        },
        { method: "CANCEL", sequence: 1 },
      )
    : undefined;
  const next = data.calendarInviteSent ? null : toBookingIcsInput(data);

  return buildRescheduleGuestIcsEmails({
    ...(previous && { previous }),
    ...(next && { next }),
  });
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  const { guestEmail, hostEmail, additionalGuestEmails, ...rest } = data;
  const from = bookingFromAddress(data.hostName);
  const attachments = guestIcsAttachments(data);
  const isPending = data.calendarInviteSent === true;

  try {
    // Send to guest (CC additional guests)
    await resend.emails.send({
      from,
      to: guestEmail,
      ...(hostEmail && { replyTo: hostEmail }),
      ...(additionalGuestEmails?.length && { cc: additionalGuestEmails }),
      ...(attachments && { attachments }),
      subject: isPending
        ? `Booking requested: ${data.eventTitle} with ${data.hostName}`
        : `Booking confirmed: ${data.eventTitle} with ${data.hostName}`,
      react: BookingConfirmationEmail({ ...rest, isHost: false, isPending }),
    });

    // Send to host
    await resend.emails.send({
      from: FROM_EMAIL,
      to: hostEmail,
      subject: isPending
        ? `New booking request: ${data.guestName} requested ${data.eventTitle}`
        : `New booking: ${data.guestName} booked ${data.eventTitle}`,
      react: BookingConfirmationEmail({ ...rest, isHost: true, isPending }),
    });
  } catch (error) {
    console.error("Error sending booking confirmation:", error);
  }
}

export async function sendBookingCancellation(data: BookingEmailData) {
  const { guestEmail, hostEmail, cancelReason, additionalGuestEmails, ...rest } = data;
  const from = bookingFromAddress(data.hostName);
  const attachments = guestIcsAttachments(data, "CANCEL");

  try {
    // Send to guest (CC additional guests)
    await resend.emails.send({
      from,
      to: guestEmail,
      ...(hostEmail && { replyTo: hostEmail }),
      ...(additionalGuestEmails?.length && { cc: additionalGuestEmails }),
      ...(attachments && { attachments }),
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
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your GudCal password",
    react: PasswordResetEmail({ firstName, resetUrl }),
  });
  handleResendSendResult(result, email, { throwOnError: true });
}

export async function sendOAuthSignInEmail({
  email,
  firstName,
  loginUrl,
}: {
  email: string;
  firstName: string;
  loginUrl: string;
}) {
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Sign in to GudCal with Google",
    react: OAuthSignInReminderEmail({ firstName, loginUrl }),
  });
  handleResendSendResult(result, email, { throwOnError: true });
}

export async function sendBookingReminder(data: Omit<BookingEmailData, "cancelReason">) {
  const { guestEmail, additionalGuestEmails, ...rest } = data;

  try {
    // Send to guest (CC additional guests)
    await resend.emails.send({
      from: bookingFromAddress(data.hostName),
      to: guestEmail,
      ...(data.hostEmail && { replyTo: data.hostEmail }),
      ...(additionalGuestEmails?.length && { cc: additionalGuestEmails }),
      subject: `Reminder: ${data.eventTitle} with ${data.hostName} tomorrow`,
      react: BookingReminderEmail({ ...rest }),
    });
  } catch (error) {
    console.error("Error sending booking reminder:", error);
  }
}

export async function sendBookingRescheduled(data: RescheduleEmailData) {
  const {
    guestEmail,
    hostEmail,
    additionalGuestEmails,
    previousInvite: _previousInvite,
    ...rest
  } = data;
  const from = bookingFromAddress(data.hostName);
  const guestIcsEmails = rescheduleGuestIcsEmails(data);
  const cancelEmail = guestIcsEmails.find((email) => email.method === "CANCEL");
  const requestEmail = guestIcsEmails.find((email) => email.method === "REQUEST");

  try {
    // CANCEL first, then REQUEST. Some clients ignore CANCEL when both ICS
    // share one email.
    if (cancelEmail) {
      await resend.emails.send({
        from,
        to: guestEmail,
        ...(hostEmail && { replyTo: hostEmail }),
        ...(additionalGuestEmails?.length && { cc: additionalGuestEmails }),
        attachments: cancelEmail.attachments,
        subject: `Previous time cancelled: ${data.eventTitle}`,
        react: BookingRescheduledEmail({ ...rest, isHost: false }),
      });
    }

    await resend.emails.send({
      from,
      to: guestEmail,
      ...(hostEmail && { replyTo: hostEmail }),
      ...(additionalGuestEmails?.length && { cc: additionalGuestEmails }),
      ...(requestEmail && { attachments: requestEmail.attachments }),
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
