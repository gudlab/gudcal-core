import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bookingFromAddress, bookingMailbox } from "../email-sender";

import { bookingIcsAttachment, buildBookingIcs } from "./ics";

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
});
