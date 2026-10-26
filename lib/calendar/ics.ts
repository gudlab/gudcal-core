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
  const hostName = input.hostName.trim() || "GudCal";
  const durationMinutes = Math.max(
    1,
    Math.round((input.end.getTime() - input.start.getTime()) / 60000),
  );

  const additional = (input.additionalGuests ?? []).filter(
    (g) => g.email && g.email.toLowerCase() !== input.guestEmail.toLowerCase(),
  );

  const { error, value } = createEvent({
    uid: `${input.uid}@gudcal.com`,
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
        name: input.guestName,
        email: input.guestEmail,
        partstat: input.method === "CANCEL" ? "DECLINED" : "NEEDS-ACTION",
        role: "REQ-PARTICIPANT",
        rsvp: true,
      },
      ...additional.map((g) => ({
        name: g.name || g.email,
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

export function bookingIcsAttachment(
  ics: string,
  method: "REQUEST" | "CANCEL" = "REQUEST",
) {
  return {
    filename: method === "CANCEL" ? "cancel.ics" : "invite.ics",
    content: Buffer.from(ics, "utf8"),
    contentType: `text/calendar; charset=UTF-8; method=${method}`,
  };
}
