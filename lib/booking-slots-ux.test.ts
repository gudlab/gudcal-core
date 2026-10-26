import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  NO_TIMES_LEFT_TODAY,
  addCalendarMonths,
  formatSlotDateInTimeZone,
  formatTodayEmptyMessage,
  guestDaysFromAvailability,
  mergeDateSets,
  nextAvailableDateKey,
  nextLookaheadMonth,
  todayEmptyHint,
} from "./booking-slots-ux";

describe("todayEmptyHint", () => {
  it("is silent while the month is still loading", () => {
    assert.equal(
      todayEmptyHint({
        todayKey: "2026-10-13",
        availableDates: [],
        monthLoading: true,
      }),
      null,
    );
  });

  it("is silent when the calendar is on another month", () => {
    assert.equal(
      todayEmptyHint({
        todayKey: "2026-10-13",
        availableDates: ["2026-11-02"],
        viewingTodayMonth: false,
      }),
      null,
    );
  });

  it("is silent when today still has slots", () => {
    assert.equal(
      todayEmptyHint({
        todayKey: "2026-10-13",
        availableDates: ["2026-10-13", "2026-10-14"],
      }),
      null,
    );
  });

  it("explains when today has no remaining slots and hints the next day", () => {
    const hint = todayEmptyHint({
      todayKey: "2026-10-13",
      availableDates: ["2026-10-15", "2026-10-14"],
      slotsByDate: {
        "2026-10-14": [{ dateTime: "2026-10-14T17:00:00.000Z" }],
      },
    });
    assert.ok(hint);
    assert.equal(hint.title, NO_TIMES_LEFT_TODAY);
    assert.equal(hint.nextDateKey, "2026-10-14");
    assert.equal(hint.nextSlotStart, "2026-10-14T17:00:00.000Z");
  });

  it("still shows the title when no later day is loaded", () => {
    const hint = todayEmptyHint({
      todayKey: "2026-10-13",
      availableDates: ["2026-10-10"],
    });
    assert.ok(hint);
    assert.equal(hint.nextDateKey, null);
    assert.equal(formatTodayEmptyMessage(hint, "UTC"), NO_TIMES_LEFT_TODAY);
  });
});

describe("formatSlotDateInTimeZone", () => {
  it("shifts the civil date for a west-of-UTC guest timezone", () => {
    // 06:00 UTC on 14 Oct = 23:00 PDT on 13 Oct.
    const iso = "2026-10-14T06:00:00.000Z";
    assert.equal(
      formatSlotDateInTimeZone(iso, "UTC"),
      "Wednesday, October 14, 2026",
    );
    assert.equal(
      formatSlotDateInTimeZone(iso, "America/Los_Angeles"),
      "Tuesday, October 13, 2026",
    );
    assert.equal(
      formatTodayEmptyMessage(
        {
          title: NO_TIMES_LEFT_TODAY,
          nextDateKey: "2026-10-14",
          nextSlotStart: iso,
        },
        "America/Los_Angeles",
      ),
      "No times left today. Next available: Tuesday, October 13, 2026",
    );
  });
});

describe("nextAvailableDateKey across month end", () => {
  it("picks the soonest date after today", () => {
    assert.equal(
      nextAvailableDateKey("2026-10-13", ["2026-10-20", "2026-10-16"]),
      "2026-10-16",
    );
    assert.equal(nextAvailableDateKey("2026-10-13", ["2026-10-13"]), null);
  });

  it("uses Nov 1 when today is Oct 31 and this month has no later slot", () => {
    const october = ["2026-10-10", "2026-10-20"];
    assert.equal(nextAvailableDateKey("2026-10-31", october), null);

    const fetch = nextLookaheadMonth({
      todayKey: "2026-10-31",
      availableDates: october,
      originYear: 2026,
      originMonth: 9,
      monthsAheadFetched: 0,
    });
    assert.deepEqual(fetch, { year: 2026, month: 10 });

    const merged = mergeDateSets(october, ["2026-11-01"]);
    assert.equal(nextAvailableDateKey("2026-10-31", merged), "2026-11-01");

    const hint = todayEmptyHint({
      todayKey: "2026-10-31",
      availableDates: merged,
      slotsByDate: {
        "2026-11-01": [{ dateTime: "2026-11-01T17:00:00.000Z" }],
      },
    });
    assert.equal(hint?.nextDateKey, "2026-11-01");
  });

  it("rolls from December into January and stops after 2 extra months", () => {
    assert.deepEqual(addCalendarMonths(2026, 11, 1), { year: 2027, month: 0 });
    assert.equal(
      nextLookaheadMonth({
        todayKey: "2026-12-31",
        availableDates: [],
        originYear: 2026,
        originMonth: 11,
        monthsAheadFetched: 2,
      }),
      null,
    );
  });

  it("does not fetch ahead when a later slot is already loaded", () => {
    assert.equal(
      nextLookaheadMonth({
        todayKey: "2026-10-13",
        availableDates: ["2026-10-20"],
        originYear: 2026,
        originMonth: 9,
        monthsAheadFetched: 0,
      }),
      null,
    );
  });
});

describe("guestDaysFromAvailability", () => {
  it("rebuckets host days onto the guest calendar", () => {
    const { dates } = guestDaysFromAvailability(
      [
        {
          date: "2026-10-14",
          slots: [{ start: "2026-10-14T06:00:00.000Z" }],
        },
      ],
      "America/Los_Angeles",
    );
    assert.deepEqual(dates, ["2026-10-13"]);
  });
});

describe("booking widget wiring", () => {
  it("formats Next available in guestTimezone and looks ahead across months", () => {
    const src = readFileSync("components/booking/booking-widget.tsx", "utf8");
    assert.match(src, /todayEmptyHint/);
    assert.match(src, /NO_TIMES_LEFT_TODAY|No times left today/);
    assert.match(src, /formatSlotDateInTimeZone/);
    assert.match(src, /guestTimezone/);
    assert.match(src, /nextLookaheadMonth/);
    assert.match(src, /NEXT_AVAILABLE_LOOKAHEAD_MONTHS/);
    assert.match(src, /GuestTimezonePicker/);
    assert.match(src, /handleTimezoneChange/);
    assert.match(src, /resolveGuestTimeZone/);
  });
});
