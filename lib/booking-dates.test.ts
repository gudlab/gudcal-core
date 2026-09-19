import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addDaysToDateKey,
  civilDateFromInstant,
  formatDisplayDate,
  groupSlotsByGuestDate,
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
