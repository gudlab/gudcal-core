import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  CALENDAR_LOOKUP_UNAVAILABLE_ERROR,
  CalendarBusyLookupError,
  SLOT_UNAVAILABLE_ERROR,
} from "../calendar/busy";
import {
  mcpLoadAvailabilityBusyTimes,
  mcpRefuseWriteIfCalendarBusy,
} from "./calendar-busy";

const slot = {
  start: new Date("2026-10-26T15:00:00.000Z"),
  end: new Date("2026-10-26T15:30:00.000Z"),
};

describe("MCP get_availability busy path", () => {
  it("includes Google busy times when the lookup succeeds", async () => {
    const busy = await mcpLoadAvailabilityBusyTimes(
      "host",
      slot.start,
      slot.end,
      async () => [slot],
    );
    assert.deepEqual(busy, [slot]);
  });

  it("fails open when the lookup fails", async () => {
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      const busy = await mcpLoadAvailabilityBusyTimes(
        "host",
        slot.start,
        slot.end,
        async () => {
          throw new CalendarBusyLookupError("Google timeout");
        },
      );
      assert.deepEqual(busy, []);
    } finally {
      console.warn = originalWarn;
    }
  });
});

describe("MCP create_booking busy path", () => {
  it("refuses a Google-busy slot with an error payload", async () => {
    const refusal = await mcpRefuseWriteIfCalendarBusy(
      { userId: "host", start: slot.start, end: slot.end },
      async () => [slot],
    );
    assert.ok(refusal);
    assert.equal(refusal.isError, true);
    assert.equal(refusal.content[0].text, SLOT_UNAVAILABLE_ERROR);
  });

  it("fails closed when the busy lookup fails", async () => {
    const refusal = await mcpRefuseWriteIfCalendarBusy(
      { userId: "host", start: slot.start, end: slot.end },
      async () => {
        throw new CalendarBusyLookupError("Google timeout");
      },
    );
    assert.ok(refusal);
    assert.equal(refusal.isError, true);
    assert.equal(refusal.content[0].text, CALENDAR_LOOKUP_UNAVAILABLE_ERROR);
  });

  it("allows the write when busy is empty (no calendar connected)", async () => {
    const refusal = await mcpRefuseWriteIfCalendarBusy(
      { userId: "host", start: slot.start, end: slot.end },
      async () => [],
    );
    assert.equal(refusal, null);
  });
});

describe("MCP server wiring", () => {
  it("get_availability and create_booking call the shared MCP busy helpers", () => {
    const serverSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "server.ts"),
      "utf8",
    );
    assert.match(serverSource, /mcpLoadAvailabilityBusyTimes/);
    assert.match(serverSource, /mcpRefuseWriteIfCalendarBusy/);
    assert.doesNotMatch(serverSource, /busyTimes:\s*\[\]/);
  });
});
