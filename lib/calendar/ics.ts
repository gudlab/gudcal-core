import { createEvent, type DateArray } from "ics";

import { bookingMailbox } from "@/lib/email-sender";

function toUtcDateArray(date: Date): DateArray {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ];
}

function sanitizeIcsName(name: string): string {
  return name.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function bookingIcsUid(bookingUid: string): string {
  return `${bookingUid}@gudcal.com`;
}

export type BookingIcsInput = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  hostName: string;
  hostEmail: string;
  guestName: string;
  guestEmail: string;
  additionalGuests?: { name?: string; email: string }[];
  method?: "REQUEST" | "CANCEL";
  sequence?: number;
};

/**
 * Build a METHOD:REQUEST/CANCEL ICS whose ORGANIZER CN is the host name and
 * whose ORGANIZER mailbox is the verified From address. Gmail flags a
 * From/ORGANIZER mismatch, and Google Calendar's own guest emails show the
 * host's Gmail as an unknown sender.
 */
export function buildBookingIcs(input: BookingIcsInput): string | null {
  const mailbox = bookingMailbox();
  const hostName = sanitizeIcsName(input.hostName) || "GudCal";
  const guestName = sanitizeIcsName(input.guestName) || input.guestEmail;
  const durationMinutes = Math.max(
    1,
    Math.round((input.end.getTime() - input.start.getTime()) / 60000),
  );

  const additional = (input.additionalGuests ?? []).filter(
    (g) => g.email && g.email.toLowerCase() !== input.guestEmail.toLowerCase(),
  );

  const { error, value } = createEvent({
    uid: bookingIcsUid(input.uid),
    productId: "-//GudCal//Booking//EN",
    title: input.title,
    description: input.description,
    location: input.location,
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/booking/${input.uid}`,
    start: toUtcDateArray(input.start),
    startInputType: "utc",
    startOutputType: "utc",
    duration: { minutes: durationMinutes },
    status: input.method === "CANCEL" ? "CANCELLED" : "CONFIRMED",
    method: input.method ?? "REQUEST",
    sequence: input.sequence ?? 0,
    calName: "GudCal",
    organizer: { name: hostName, email: mailbox },
    attendees: [
      {
        name: hostName,
        email: input.hostEmail || mailbox,
        partstat: "ACCEPTED",
        role: "CHAIR",
        rsvp: false,
      },
      {
        name: guestName,
        email: input.guestEmail,
        partstat: input.method === "CANCEL" ? "DECLINED" : "NEEDS-ACTION",
        role: "REQ-PARTICIPANT",
        rsvp: true,
      },
      ...additional.map((g) => ({
        name: sanitizeIcsName(g.name || "") || g.email,
        email: g.email,
        partstat: "NEEDS-ACTION" as const,
        role: "REQ-PARTICIPANT" as const,
        rsvp: true,
      })),
    ],
  });

  if (error || !value) {
    console.error("Failed to build booking ICS", error);
    return null;
  }
  return value.replace(/\r?\n/g, "\r\n");
}

/**
 * Resend's JSON body expects attachment content as a Base64 string. A Node
 * Buffer serializes as `{ type: "Buffer", data: [...] }`, which is not that
 * documented shape.
 */
export function bookingIcsAttachment(
  ics: string,
  method: "REQUEST" | "CANCEL" = "REQUEST",
) {
  return {
    filename: method === "CANCEL" ? "cancel.ics" : "invite.ics",
    content: Buffer.from(ics, "utf8").toString("base64"),
    contentType: `text/calendar; charset=UTF-8; method=${method}`,
  };
}

export type IcsAttachment = ReturnType<typeof bookingIcsAttachment>;

export function decodeIcsAttachmentContent(content: string): string {
  return Buffer.from(content, "base64").toString("utf8");
}

export type RescheduleGuestIcsEmail = {
  method: "CANCEL" | "REQUEST";
  attachments: IcsAttachment[];
};

/**
 * Reschedule creates a new booking row (new UID). Some calendar clients
 * ignore METHOD:CANCEL when CANCEL and REQUEST share one email, so emit one
 * guest email per ICS method: CANCEL (old confirmed UID) then REQUEST (new
 * UID).
 */
export function buildRescheduleGuestIcsEmails(input: {
  previous?: BookingIcsInput;
  next?: BookingIcsInput;
}): RescheduleGuestIcsEmail[] {
  const emails: RescheduleGuestIcsEmail[] = [];

  if (input.previous) {
    const ics = buildBookingIcs({
      ...input.previous,
      method: "CANCEL",
      sequence: input.previous.sequence ?? 1,
    });
    if (ics) {
      emails.push({
        method: "CANCEL",
        attachments: [bookingIcsAttachment(ics, "CANCEL")],
      });
    }
  }

  if (input.next) {
    const ics = buildBookingIcs({
      ...input.next,
      method: input.next.method ?? "REQUEST",
      sequence: input.next.sequence ?? 0,
    });
    if (ics) {
      emails.push({
        method: "REQUEST",
        attachments: [bookingIcsAttachment(ics, "REQUEST")],
      });
    }
  }

  return emails;
}
