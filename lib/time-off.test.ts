import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { getAvailableSlots } from "./availability";
import { mergeBusyIntervals } from "./calendar/connection-policy";
import {
  findOverlappingRanges,
  resolveTimeOffRange,
  slotOverlapsBusyTimes,
  timeOffsToBusyIntervals,
} from "./time-off";
import { timeOffSchema } from "./validations/time-off";

describe("timeOffsToBusyIntervals", () => {
  it("maps TimeOff rows onto the same busy interval shape as calendar busyTimes", () => {
    const start = new Date("2026-10-26T13:00:00.000Z");
    const end = new Date("2026-10-26T17:00:00.000Z");
    const busy = timeOffsToBusyIntervals([{ startAt: start, endAt: end }]);
    assert.deepEqual(busy, [{ start, end }]);
  });

  it("merges adjacent TimeOff with calendar busy the same way other busy ranges merge", () => {
    const timeOff = timeOffsToBusyIntervals([
      {
        startAt: new Date("2026-10-26T15:00:00.000Z"),
        endAt: new Date("2026-10-26T17:00:00.000Z"),
      },
    ]);
    const calendar = [
      {
        start: new Date("2026-10-26T13:00:00.000Z"),
        end: new Date("2026-10-26T15:00:00.000Z"),
      },
    ];
    const merged = mergeBusyIntervals([...calendar, ...timeOff]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].start.toISOString(), "2026-10-26T13:00:00.000Z");
    assert.equal(merged[0].end.toISOString(), "2026-10-26T17:00:00.000Z");
  });
});

describe("slotOverlapsBusyTimes", () => {
  it("treats TimeOff as busy for booking POST overlap checks", () => {
    const timeOff = timeOffsToBusyIntervals([
      {
        startAt: new Date("2026-10-26T14:00:00.000Z"),
        endAt: new Date("2026-10-26T16:00:00.000Z"),
      },
    ]);

    assert.equal(
      slotOverlapsBusyTimes(
        new Date("2026-10-26T15:00:00.000Z"),
        new Date("2026-10-26T15:30:00.000Z"),
        timeOff,
      ),
      true,
    );
    assert.equal(
      slotOverlapsBusyTimes(
        new Date("2026-10-26T16:00:00.000Z"),
        new Date("2026-10-26T16:30:00.000Z"),
        timeOff,
      ),
      false,
    );
  });
});

describe("getAvailableSlots with TimeOff busyTimes", () => {
  it("hides slots that sit inside a TimeOff range", () => {
    const startDate = new Date("2028-01-03T00:00:00.000Z");
    const endDate = new Date("2028-01-03T23:59:59.999Z");
    const days = getAvailableSlots({
      startDate,
      endDate,
      duration: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      minimumNotice: 0,
      rules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }],
      dateOverrides: [],
      hostTimezone: "UTC",
      busyTimes: timeOffsToBusyIntervals([
        {
          startAt: new Date("2028-01-03T10:00:00.000Z"),
          endAt: new Date("2028-01-03T11:00:00.000Z"),
        },
      ]),
      existingBookings: [],
    });

    const monday = days.find((day) => day.date === "2028-01-03");
    assert.ok(monday);
    const starts = monday.slots.map((slot) => slot.start.toISOString());
    assert.ok(starts.includes("2028-01-03T09:00:00.000Z"));
    assert.ok(!starts.includes("2028-01-03T10:00:00.000Z"));
    assert.ok(starts.includes("2028-01-03T11:00:00.000Z"));
  });
});

describe("resolveTimeOffRange", () => {
  it("keeps timed blocks as given", () => {
    const startAt = new Date("2026-10-26T14:00:00.000Z");
    const endAt = new Date("2026-10-26T16:00:00.000Z");
    const range = resolveTimeOffRange({
      startAt,
      endAt,
      allDay: false,
      timezone: "America/New_York",
    });
    assert.equal(range.startAt.toISOString(), startAt.toISOString());
    assert.equal(range.endAt.toISOString(), endAt.toISOString());
  });

  it("expands all-day blocks to the host timezone civil day", () => {
    const range = resolveTimeOffRange({
      startAt: new Date("2026-10-26T16:00:00.000Z"),
      endAt: new Date("2026-10-26T16:00:00.000Z"),
      allDay: true,
      timezone: "America/New_York",
    });
    assert.equal(range.startAt.toISOString(), "2026-10-26T04:00:00.000Z");
    assert.equal(range.endAt.toISOString(), "2026-10-27T03:59:59.999Z");
  });
});

describe("findOverlappingRanges", () => {
  it("returns bookings that overlap a new TimeOff block", () => {
    const overlaps = findOverlappingRanges(
      {
        start: new Date("2026-10-26T13:00:00.000Z"),
        end: new Date("2026-10-26T17:00:00.000Z"),
      },
      [
        {
          start: new Date("2026-10-26T16:30:00.000Z"),
          end: new Date("2026-10-26T17:00:00.000Z"),
        },
        {
          start: new Date("2026-10-26T17:00:00.000Z"),
          end: new Date("2026-10-26T17:30:00.000Z"),
        },
      ],
    );
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].start.toISOString(), "2026-10-26T16:30:00.000Z");
  });
});

describe("timeOffSchema", () => {
  it("accepts a valid TimeOff payload", () => {
    const parsed = timeOffSchema.safeParse({
      startAt: "2026-10-26T14:00:00.000Z",
      endAt: "2026-10-26T16:00:00.000Z",
      allDay: false,
      label: "SICK",
      reason: "Doctor",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects an end at or before start", () => {
    const parsed = timeOffSchema.safeParse({
      startAt: "2026-10-26T16:00:00.000Z",
      endAt: "2026-10-26T16:00:00.000Z",
      allDay: false,
      label: "AWAY",
    });
    assert.equal(parsed.success, false);
  });
});

describe("booking POST refuses TimeOff overlap", () => {
  it("checks TimeOff before creating a booking and returns a 409", () => {
    const src = readFileSync("app/api/bookings/route.ts", "utf8");
    const constants = readFileSync("lib/time-off.ts", "utf8");
    assert.match(src, /getTimeOffBusyTimes/);
    assert.match(src, /slotOverlapsBusyTimes/);
    assert.match(src, /TIME_OFF_OVERLAP_ERROR/);
    assert.match(constants, /This time slot overlaps with time off/);
    assert.match(src, /tx\.timeOff\.findFirst/);
    assert.match(src, /status: 409/);
  });
});

describe("TimeOff CRUD actions", () => {
  it("creates and deletes TimeOff, and can cancel overlapping bookings", () => {
    const src = readFileSync("actions/time-off.ts", "utf8");
    assert.match(src, /export async function listTimeOff/);
    assert.match(src, /export async function createTimeOff/);
    assert.match(src, /export async function deleteTimeOff/);
    assert.match(src, /cancelOverlapping/);
    assert.match(src, /status: "overlap"/);
    assert.match(src, /cancelBooking/);
    assert.match(src, /prisma\.timeOff\.create/);
    assert.match(src, /prisma\.timeOff\.delete/);
    assert.match(src, /revalidatePath\("\/dashboard"\)/);
    assert.match(src, /revalidatePath\("\/dashboard\/availability"\)/);
  });
});
