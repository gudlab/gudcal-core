import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addDaysToDateKey,
  civilDateFromInstant,
  formatDisplayDate,
  groupSlotsByGuestDate,
  isDateKey,
  isoSlotsByGuestDate,
  resolveGuestTimeZone,
  resolveTimeZone,
  zonedEndOfDay,
  zonedStartOfDay,
} from "./booking-dates";

describe("formatDisplayDate", () => {
  it("keeps the civil date in America/Los_Angeles (issue #15)", () => {
    const buggy = new Date("2026-09-16").toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Los_Angeles",
    });
    assert.equal(buggy, "Tuesday, September 15, 2026");
    assert.equal(
      formatDisplayDate("2026-09-16", "America/Los_Angeles"),
      "Wednesday, September 16, 2026",
    );
  });

  it("is stable across UTC+14 and UTC-12", () => {
    assert.equal(
      formatDisplayDate("2026-01-01", "Pacific/Kiritimati"),
      "Thursday, January 1, 2026",
    );
    assert.equal(
      formatDisplayDate("2026-01-01", "Pacific/Pago_Pago"),
      "Thursday, January 1, 2026",
    );
  });
});

describe("civilDateFromInstant", () => {
  it("maps 1:00 AM PDT on 16 Sep 2026 to 2026-09-16", () => {
    assert.equal(
      civilDateFromInstant("2026-09-16T08:00:00.000Z", "America/Los_Angeles"),
      "2026-09-16",
    );
  });

  it("maps a London morning slot to the previous calendar day in LA", () => {
    assert.equal(
      civilDateFromInstant("2026-09-16T06:00:00.000Z", "Europe/London"),
      "2026-09-16",
    );
    assert.equal(
      civilDateFromInstant("2026-09-16T06:00:00.000Z", "America/Los_Angeles"),
      "2026-09-15",
    );
  });
});

describe("groupSlotsByGuestDate", () => {
  it("re-buckets host-TZ days onto the guest calendar", () => {
    const grouped = groupSlotsByGuestDate(
      [
        {
          date: "2026-09-16",
          slots: [
            { start: "2026-09-16T06:00:00.000Z" },
            { start: "2026-09-16T08:00:00.000Z" },
          ],
        },
      ],
      "America/Los_Angeles",
    );
    assert.deepEqual(
      grouped.map((d) => d.date),
      ["2026-09-15", "2026-09-16"],
    );
    assert.equal(grouped[0].slots.length, 1);
    assert.equal(grouped[1].slots.length, 1);
  });
});

describe("addDaysToDateKey", () => {
  it("crosses month boundaries", () => {
    assert.equal(addDaysToDateKey("2026-09-01", -1), "2026-08-31");
    assert.equal(addDaysToDateKey("2026-09-30", 1), "2026-10-01");
  });
});

describe("isDateKey", () => {
  it("accepts civil dates and rejects junk", () => {
    assert.equal(isDateKey("2026-09-16"), true);
    assert.equal(isDateKey("2026-9-16"), false);
    assert.equal(isDateKey("not-a-date"), false);
  });
});

describe("resolveTimeZone", () => {
  it("falls back to UTC for missing or invalid values", () => {
    assert.equal(resolveTimeZone(undefined), "UTC");
    assert.equal(resolveTimeZone("Not/AZone"), "UTC");
    assert.notEqual(resolveTimeZone(undefined), "America/New_York");
  });

  it("keeps a real IANA zone", () => {
    assert.equal(resolveTimeZone("Pacific/Auckland"), "Pacific/Auckland");
  });
});

describe("resolveGuestTimeZone", () => {
  it("prefers a valid candidate over the browser zone", () => {
    assert.equal(
      resolveGuestTimeZone("Europe/London"),
      "Europe/London",
    );
  });

  it("falls back to the detected Intl zone or UTC", () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const expected =
      detected && resolveTimeZone(detected) === detected ? detected : "UTC";
    assert.equal(resolveGuestTimeZone(undefined), expected);
    assert.equal(resolveGuestTimeZone("Not/AZone"), expected);
  });
});

describe("zonedStartOfDay / zonedEndOfDay", () => {
  it("maps Los Angeles midnight to 07:00 UTC in September (PDT)", () => {
    assert.equal(
      zonedStartOfDay("2026-09-16", "America/Los_Angeles").toISOString(),
      "2026-09-16T07:00:00.000Z",
    );
  });

  it("maps London midnight to 23:00 UTC the previous day in September (BST)", () => {
    assert.equal(
      zonedStartOfDay("2026-09-16", "Europe/London").toISOString(),
      "2026-09-15T23:00:00.000Z",
    );
  });

  it("places a 00:30 UTC slot on the previous Los Angeles calendar day", () => {
    const grouped = groupSlotsByGuestDate(
      [
        {
          date: "2026-09-16",
          slots: [
            {
              start: "2026-09-16T00:30:00.000Z",
              end: "2026-09-16T00:45:00.000Z",
            },
          ],
        },
      ],
      "America/Los_Angeles",
    );
    assert.deepEqual(
      grouped.map((d) => d.date),
      ["2026-09-15"],
    );
  });

  it("ends Los Angeles Sep 16 at 06:59:59.999 UTC (PDT)", () => {
    assert.equal(
      zonedEndOfDay("2026-09-16", "America/Los_Angeles").toISOString(),
      "2026-09-17T06:59:59.999Z",
    );
  });
});

describe("isoSlotsByGuestDate", () => {
  it("re-buckets Date slots onto the guest civil day", () => {
    const grouped = isoSlotsByGuestDate(
      [
        {
          date: "2026-09-16",
          slots: [
            {
              start: new Date("2026-09-16T00:30:00.000Z"),
              end: new Date("2026-09-16T00:45:00.000Z"),
            },
          ],
        },
      ],
      "America/Los_Angeles",
    );
    assert.deepEqual(
      grouped.map((d) => d.date),
      ["2026-09-15"],
    );
    assert.equal(grouped[0].slots[0].start, "2026-09-16T00:30:00.000Z");
  });
});
