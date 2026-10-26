import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { bookingFromAddress, bookingMailbox } from "./email-sender";

function withEmailFrom(value: string | undefined, fn: () => void): void {
  const previous = process.env.EMAIL_FROM;
  if (value === undefined) {
    delete process.env.EMAIL_FROM;
  } else {
    process.env.EMAIL_FROM = value;
  }
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env.EMAIL_FROM;
    } else {
      process.env.EMAIL_FROM = previous;
    }
  }
}

describe("bookingMailbox", () => {
  it("defaults to the core verified mailbox", () => {
    withEmailFrom(undefined, () => {
      assert.equal(bookingMailbox(), "noreply@mailman.gudcal.com");
    });
  });

  it("extracts the mailbox from EMAIL_FROM display-name form", () => {
    withEmailFrom("GudCal <bookings@cal.example.com>", () => {
      assert.equal(bookingMailbox(), "bookings@cal.example.com");
    });
  });

  it("accepts a bare EMAIL_FROM mailbox", () => {
    withEmailFrom("invites@cal.example.com", () => {
      assert.equal(bookingMailbox(), "invites@cal.example.com");
    });
  });

  it("falls back when EMAIL_FROM has no mailbox", () => {
    withEmailFrom("not-an-address", () => {
      assert.equal(bookingMailbox(), "noreply@mailman.gudcal.com");
    });
  });
});

describe("bookingFromAddress", () => {
  it("uses HostName via GudCal when a host name is present", () => {
    withEmailFrom(undefined, () => {
      assert.equal(
        bookingFromAddress("Ada Lovelace"),
        "Ada Lovelace via GudCal <noreply@mailman.gudcal.com>",
      );
    });
  });

  it("uses GudCal when the host name is empty", () => {
    withEmailFrom("GudCal <bookings@cal.example.com>", () => {
      assert.equal(bookingFromAddress(""), "GudCal <bookings@cal.example.com>");
      assert.equal(bookingFromAddress(null), "GudCal <bookings@cal.example.com>");
    });
  });

  it("quotes display names that contain commas", () => {
    withEmailFrom(undefined, () => {
      assert.equal(
        bookingFromAddress("Lovelace, Ada"),
        '"Lovelace, Ada" via GudCal <noreply@mailman.gudcal.com>',
      );
    });
  });

  it("strips newlines and angle brackets from the display name", () => {
    withEmailFrom(undefined, () => {
      assert.equal(
        bookingFromAddress("Ada\n<spoof@evil.test>"),
        "Ada spoof@evil.test via GudCal <noreply@mailman.gudcal.com>",
      );
    });
  });
});

describe("invite-sender call sites", () => {
  it("attaches ICS for confirmed create/reschedule/confirm and always on cancel", () => {
    const create = readFileSync("app/api/bookings/route.ts", "utf8");
    const reschedule = readFileSync("app/api/bookings/reschedule/route.ts", "utf8");
    const actions = readFileSync("actions/bookings.ts", "utf8");

    assert.match(create, /calendarInviteSent: booking\.status !== "CONFIRMED"/);
    assert.match(
      reschedule,
      /calendarInviteSent: newBooking\.status !== "CONFIRMED"/,
    );
    assert.match(
      actions,
      /calendarInviteSent: updatedBooking\.status !== "CONFIRMED"/,
    );
    assert.doesNotMatch(actions, /calendarInviteSent:\s*Boolean\(/);
    assert.doesNotMatch(create, /calendarInviteSent:\s*Boolean\(/);
    assert.doesNotMatch(reschedule, /calendarInviteSent:\s*Boolean\(/);
  });

  it("creates Google host events without attendees and without guest emails", () => {
    const google = readFileSync("lib/calendar/google.ts", "utf8");
    assert.match(google, /sendUpdates: "none"/);
    assert.doesNotMatch(google, /sendUpdates: "all"/);
    assert.match(google, /organizerName: host\?\.name/);
    assert.match(google, /eventData\.organizer = \{ displayName: event\.organizerName \}/);
    assert.doesNotMatch(google, /organizer:\s*\{[^}]*email/);
    assert.match(google, /Omit attendees/);
  });
});
