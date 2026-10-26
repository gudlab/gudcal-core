import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isWorkingDay,
  monthGridDays,
  workingWindowsForDate,
  weekDays,
} from "./dashboard-calendar";

describe("dashboard calendar helpers", () => {
  it("finds working windows in the host timezone", () => {
    const day = new Date("2026-10-26T16:00:00.000Z");
    const windows = workingWindowsForDate(
      day,
      [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
      "America/New_York",
    );
    assert.equal(windows.length, 1);
    assert.equal(windows[0].start.toISOString(), "2026-10-26T13:00:00.000Z");
    assert.equal(windows[0].end.toISOString(), "2026-10-26T21:00:00.000Z");
    assert.equal(
      isWorkingDay(
        day,
        [{ dayOfWeek: 0, startTime: "09:00", endTime: "12:00" }],
        "America/New_York",
      ),
      false,
    );
  });

  it("builds a 42-day month grid and a 7-day week", () => {
    const cursor = new Date("2026-10-26T16:00:00.000Z");
    assert.equal(monthGridDays(cursor, "UTC", 1).length, 42);
    assert.equal(weekDays(cursor, "UTC", 1).length, 7);
  });
});
