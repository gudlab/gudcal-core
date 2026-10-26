import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bookingFromAddress, bookingMailbox } from "../email-sender";

import {
  bookingIcsAttachment,
  bookingIcsUid,
  buildBookingIcs,
  buildRescheduleGuestIcsEmails,
  decodeIcsAttachmentContent,
} from "./ics";

const start = new Date("2026-11-02T15:00:00.000Z");
const end = new Date("2026-11-02T15:30:00.000Z");

function sampleIcs(method?: "REQUEST" | "CANCEL") {
  return buildBookingIcs({
    uid: "bk_test_uid",
    title: "Intro call with Ada",
    description: "Bring questions",
    location: "Google Meet",
    start,
    end,
    hostName: "Ada Lovelace",
    hostEmail: "ada@host.example",
    guestName: "Guest User",
    guestEmail: "guest@example.com",
    method,
  });
}

describe("buildBookingIcs", () => {
  it("sets ORGANIZER CN to the host name and mailbox to the verified From mailbox", () => {
    const ics = sampleIcs("REQUEST");
    assert.ok(ics);
    const mailbox = bookingMailbox();
    const from = bookingFromAddress("Ada Lovelace");

    assert.match(ics, /METHOD:REQUEST/);
    assert.match(ics, /STATUS:CONFIRMED/);
    assert.match(ics, /ORGANIZER;CN="Ada Lovelace":MAILTO:/);
    assert.match(
      ics,
      new RegExp(`ORGANIZER;CN="Ada Lovelace":MAILTO:${mailbox}`),
    );
    assert.match(from, new RegExp(`<${mailbox}>`));
    assert.equal(from, `Ada Lovelace via GudCal <${mailbox}>`);
  });

  it("builds METHOD:CANCEL with cancelled status", () => {
    const ics = sampleIcs("CANCEL");
    assert.ok(ics);
    assert.match(ics, /METHOD:CANCEL/);
    assert.match(ics, /STATUS:CANCELLED/);
    assert.match(ics, /ORGANIZER;CN="Ada Lovelace":MAILTO:/);
  });

  it("strips CR/LF from organizer and attendee names", () => {
    const ics = buildBookingIcs({
      uid: "bk_inject",
      title: "Intro call",
      start,
      end,
      hostName: "Ada\r\nLovelace",
      hostEmail: "ada@host.example",
      guestName: "Guest\nUser",
      guestEmail: "guest@example.com",
    });
    assert.ok(ics);
    assert.doesNotMatch(ics, /CN="Ada\r\nLovelace"/);
    assert.doesNotMatch(ics, /CN="Guest\nUser"/);
    assert.match(ics, /CN="Ada Lovelace"/);
  });
});

describe("bookingIcsAttachment", () => {
  it("names REQUEST and CANCEL attachments", () => {
    const request = bookingIcsAttachment("BEGIN:VCALENDAR", "REQUEST");
    const cancel = bookingIcsAttachment("BEGIN:VCALENDAR", "CANCEL");
    assert.equal(request.filename, "invite.ics");
    assert.equal(cancel.filename, "cancel.ics");
    assert.equal(request.contentType, "text/calendar; charset=UTF-8; method=REQUEST");
    assert.equal(cancel.contentType, "text/calendar; charset=UTF-8; method=CANCEL");
  });

  it("passes Base64 string content, not a Node Buffer", () => {
    const ics = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";
    const attachment = bookingIcsAttachment(ics, "REQUEST");

    assert.equal(typeof attachment.content, "string");
    assert.equal(Buffer.isBuffer(attachment.content), false);
    assert.doesNotMatch(JSON.stringify(attachment), /"type":"Buffer"/);
    assert.equal(decodeIcsAttachmentContent(attachment.content), ics);
    assert.equal(
      attachment.content,
      Buffer.from(ics, "utf8").toString("base64"),
    );
  });
});

describe("buildRescheduleGuestIcsEmails", () => {
  const previousStart = new Date("2026-11-02T15:00:00.000Z");
  const previousEnd = new Date("2026-11-02T15:30:00.000Z");
  const nextStart = new Date("2026-11-03T16:00:00.000Z");
  const nextEnd = new Date("2026-11-03T16:30:00.000Z");

  const shared = {
    title: "Intro call with Ada",
    hostName: "Ada Lovelace",
    hostEmail: "ada@host.example",
    guestName: "Guest User",
    guestEmail: "guest@example.com",
  };

  it("emits CANCEL then REQUEST as two guest emails", () => {
    const emails = buildRescheduleGuestIcsEmails({
      previous: {
        ...shared,
        uid: "old_booking_uid",
        start: previousStart,
        end: previousEnd,
      },
      next: {
        ...shared,
        uid: "new_booking_uid",
        start: nextStart,
        end: nextEnd,
      },
    });

    assert.equal(emails.length, 2);
    assert.equal(emails[0].method, "CANCEL");
    assert.equal(emails[1].method, "REQUEST");
    assert.equal(emails[0].attachments.length, 1);
    assert.equal(emails[1].attachments.length, 1);
    assert.equal(emails[0].attachments[0].filename, "cancel.ics");
    assert.equal(emails[1].attachments[0].filename, "invite.ics");
    assert.equal(
      emails[0].attachments[0].contentType,
      "text/calendar; charset=UTF-8; method=CANCEL",
    );
    assert.equal(
      emails[1].attachments[0].contentType,
      "text/calendar; charset=UTF-8; method=REQUEST",
    );

    const cancelAttachment = emails[0].attachments[0];
    const requestAttachment = emails[1].attachments[0];
    assert.equal(typeof cancelAttachment.content, "string");
    assert.equal(typeof requestAttachment.content, "string");
    assert.equal(Buffer.isBuffer(cancelAttachment.content), false);
    assert.doesNotMatch(JSON.stringify(cancelAttachment), /"type":"Buffer"/);

    const cancel = decodeIcsAttachmentContent(cancelAttachment.content);
    const request = decodeIcsAttachmentContent(requestAttachment.content);

    assert.match(cancel, /METHOD:CANCEL/);
    assert.match(cancel, /STATUS:CANCELLED/);
    assert.match(cancel, /SEQUENCE:1/);
    assert.match(cancel, new RegExp(`UID:${bookingIcsUid("old_booking_uid")}`));
    assert.doesNotMatch(cancel, new RegExp(`UID:${bookingIcsUid("new_booking_uid")}`));

    assert.match(request, /METHOD:REQUEST/);
    assert.match(request, /STATUS:CONFIRMED/);
    assert.match(request, /SEQUENCE:0/);
    assert.match(request, new RegExp(`UID:${bookingIcsUid("new_booking_uid")}`));
    assert.doesNotMatch(request, new RegExp(`UID:${bookingIcsUid("old_booking_uid")}`));
  });

  it("emits only CANCEL when the new booking is not a confirmed invite", () => {
    const emails = buildRescheduleGuestIcsEmails({
      previous: {
        ...shared,
        uid: "old_booking_uid",
        start: previousStart,
        end: previousEnd,
      },
    });
    assert.equal(emails.length, 1);
    assert.equal(emails[0].method, "CANCEL");
    assert.equal(emails[0].attachments[0].filename, "cancel.ics");
    assert.match(
      decodeIcsAttachmentContent(emails[0].attachments[0].content),
      /METHOD:CANCEL/,
    );
  });

  it("emits only REQUEST when there was no prior confirmed invite", () => {
    const emails = buildRescheduleGuestIcsEmails({
      next: {
        ...shared,
        uid: "new_booking_uid",
        start: nextStart,
        end: nextEnd,
      },
    });
    assert.equal(emails.length, 1);
    assert.equal(emails[0].method, "REQUEST");
    assert.equal(emails[0].attachments.length, 1);
  });
});
