import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CALENDAR_LOOKUP_UNAVAILABLE_ERROR,
  CalendarBusyLookupError,
  SLOT_UNAVAILABLE_ERROR,
  checkWriteAgainstCalendarBusy,
  excludeOverlappingBusy,
  getBusyTimesForRead,
  parseGoogleFreeBusy,
  queryGoogleBusyTimes,
  slotOverlapsBusy,
} from "./busy";

const slot = {
  start: new Date("2026-10-26T15:00:00.000Z"),
  end: new Date("2026-10-26T15:30:00.000Z"),
};

describe("parseGoogleFreeBusy", () => {
  it("maps busy intervals", () => {
    const busy = parseGoogleFreeBusy(
      {
        calendars: {
          primary: {
            busy: [
              {
                start: "2026-10-26T15:00:00.000Z",
                end: "2026-10-26T16:00:00.000Z",
              },
            ],
          },
        },
      },
      "primary",
    );
    assert.equal(busy.length, 1);
    assert.equal(busy[0].start.toISOString(), "2026-10-26T15:00:00.000Z");
    assert.equal(busy[0].end.toISOString(), "2026-10-26T16:00:00.000Z");
  });

  it("returns [] when the calendar is present and busy is empty", () => {
    assert.deepEqual(
      parseGoogleFreeBusy({ calendars: { primary: { busy: [] } } }, "primary"),
      [],
    );
  });

  it("throws when the calendar is missing from the response", () => {
    assert.throws(
      () => parseGoogleFreeBusy({ calendars: {} }, "primary"),
      CalendarBusyLookupError,
    );
  });

  it("throws when Google reports per-calendar errors", () => {
    assert.throws(
      () =>
        parseGoogleFreeBusy(
          {
            calendars: {
              primary: { errors: [{ reason: "notFound" }] },
            },
          },
          "primary",
        ),
      /notFound/,
    );
  });
});

describe("queryGoogleBusyTimes", () => {
  it("returns [] when no calendar is connected", async () => {
    const busy = await queryGoogleBusyTimes(null, async () => {
      throw new Error("should not query Google when disconnected");
    });
    assert.deepEqual(busy, []);
  });

  it("throws when a connection exists but has no calendar ID", async () => {
    await assert.rejects(
      () => queryGoogleBusyTimes({ calendarId: null }, async () => ({ data: {} })),
      CalendarBusyLookupError,
    );
  });

  it("wraps query failures instead of treating them as free", async () => {
    await assert.rejects(
      () =>
        queryGoogleBusyTimes({ calendarId: "primary" }, async () => {
          throw new Error("network down");
        }),
      (error: unknown) =>
        error instanceof CalendarBusyLookupError &&
        /Failed to fetch Google Calendar busy times/.test(error.message),
    );
  });

  it("returns parsed busy times on success", async () => {
    const busy = await queryGoogleBusyTimes({ calendarId: "primary" }, async () => ({
      data: {
        calendars: {
          primary: {
            busy: [
              {
                start: "2026-10-26T15:00:00.000Z",
                end: "2026-10-26T15:30:00.000Z",
              },
            ],
          },
        },
      },
    }));
    assert.equal(busy.length, 1);
  });
});

describe("slotOverlapsBusy", () => {
  it("detects a direct overlap", () => {
    assert.equal(
      slotOverlapsBusy(slot, [
        {
          start: new Date("2026-10-26T15:15:00.000Z"),
          end: new Date("2026-10-26T16:00:00.000Z"),
        },
      ]),
      true,
    );
  });

  it("applies buffers around busy periods", () => {
    assert.equal(
      slotOverlapsBusy(
        slot,
        [
          {
            start: new Date("2026-10-26T14:00:00.000Z"),
            end: new Date("2026-10-26T14:50:00.000Z"),
          },
        ],
        0,
        15,
      ),
      true,
    );
  });
});

describe("excludeOverlappingBusy", () => {
  it("drops the original booking's Google block on reschedule", () => {
    const remaining = excludeOverlappingBusy(
      [slot],
      {
        start: new Date("2026-10-26T15:00:00.000Z"),
        end: new Date("2026-10-26T15:30:00.000Z"),
      },
    );
    assert.deepEqual(remaining, []);
  });
});

describe("checkWriteAgainstCalendarBusy", () => {
  it("returns 409 when the slot intersects Google busy time", async () => {
    const result = await checkWriteAgainstCalendarBusy(
      { userId: "host", start: slot.start, end: slot.end },
      async () => [slot],
    );
    assert.deepEqual(result, {
      ok: false,
      status: 409,
      error: SLOT_UNAVAILABLE_ERROR,
    });
  });

  it("returns 503 when the busy lookup fails", async () => {
    const result = await checkWriteAgainstCalendarBusy(
      { userId: "host", start: slot.start, end: slot.end },
      async () => {
        throw new CalendarBusyLookupError("Google timeout");
      },
    );
    assert.deepEqual(result, {
      ok: false,
      status: 503,
      error: CALENDAR_LOOKUP_UNAVAILABLE_ERROR,
    });
  });

  it("allows the slot when no calendar is connected (empty busy)", async () => {
    const result = await checkWriteAgainstCalendarBusy(
      { userId: "host", start: slot.start, end: slot.end },
      async () => [],
    );
    assert.deepEqual(result, { ok: true });
  });

  it("ignores the original booking interval when rescheduling", async () => {
    const result = await checkWriteAgainstCalendarBusy(
      {
        userId: "host",
        start: slot.start,
        end: slot.end,
        ignoreBusyOverlapping: slot,
      },
      async () => [slot],
    );
    assert.deepEqual(result, { ok: true });
  });
});

describe("getBusyTimesForRead", () => {
  it("fails open and returns [] when the lookup throws", async () => {
    const warnings: unknown[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };
    try {
      const busy = await getBusyTimesForRead(
        "host",
        slot.start,
        slot.end,
        async () => {
          throw new CalendarBusyLookupError("Google timeout");
        },
      );
      assert.deepEqual(busy, []);
      assert.equal(warnings.length > 0, true);
    } finally {
      console.warn = originalWarn;
    }
  });

  it("returns Google busy times when the lookup succeeds", async () => {
    const busy = await getBusyTimesForRead(
      "host",
      slot.start,
      slot.end,
      async () => [slot],
    );
    assert.deepEqual(busy, [slot]);
  });
});
