import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

describe("HTTP booking write paths", () => {
  it("create and reschedule call checkWriteAgainstCalendarBusy", () => {
    const create = readFileSync(join(dir, "route.ts"), "utf8");
    const reschedule = readFileSync(
      join(dir, "reschedule", "route.ts"),
      "utf8",
    );
    assert.match(create, /checkWriteAgainstCalendarBusy/);
    assert.match(create, /getTimeOffBusyTimes/);
    assert.match(create, /TIME_OFF_OVERLAP_ERROR/);
    assert.match(reschedule, /checkWriteAgainstCalendarBusy/);
    assert.match(reschedule, /getTimeOffBusyTimes/);
    assert.match(reschedule, /ignoreExactBusyInterval/);
    assert.match(reschedule, /googleEventId/);
  });
});

describe("HTTP availability read path", () => {
  it("uses getBusyTimesForRead (fail-open)", () => {
    const availability = readFileSync(
      join(dir, "..", "availability", "[username]", "route.ts"),
      "utf8",
    );
    assert.match(availability, /getBusyTimesForRead/);
    assert.doesNotMatch(availability, /getBusyTimes\(/);
  });
});
