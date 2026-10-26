import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { addMinutes } from "date-fns";

import {
  MINIMUM_NOTICE_ERROR,
  checkMinimumNotice,
  refuseWriteIfInsideMinimumNotice,
} from "./booking-notice";

const now = new Date("2026-10-26T15:00:00.000Z");

describe("checkMinimumNotice", () => {
  it("rejects a start inside the notice window (HTTP QA: ~13 min, notice 60)", () => {
    const start = addMinutes(now, 13);
    const result = checkMinimumNotice(start, 60, now);
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("expected refusal");
    assert.equal(result.status, 409);
    assert.equal(result.error, MINIMUM_NOTICE_ERROR);
  });

  it("rejects a start inside the notice window (MCP QA: ~42 min, notice 60)", () => {
    const start = addMinutes(now, 42);
    const result = checkMinimumNotice(start, 60, now);
    assert.equal(result.ok, false);
  });

  it("rejects a start exactly at now + notice (same as availability isAfter)", () => {
    const start = addMinutes(now, 60);
    assert.equal(checkMinimumNotice(start, 60, now).ok, false);
  });

  it("allows a start outside the notice window", () => {
    const start = addMinutes(now, 61);
    assert.deepEqual(checkMinimumNotice(start, 60, now), { ok: true });
  });

  it("allows a start well outside notice", () => {
    const start = addMinutes(now, 120);
    assert.equal(checkMinimumNotice(start, 60, now).ok, true);
  });
});

describe("refuseWriteIfInsideMinimumNotice", () => {
  it("returns a 409 payload inside notice and null outside", () => {
    assert.deepEqual(
      refuseWriteIfInsideMinimumNotice(addMinutes(now, 13), 60, now),
      { error: MINIMUM_NOTICE_ERROR, status: 409 },
    );
    assert.equal(
      refuseWriteIfInsideMinimumNotice(addMinutes(now, 90), 60, now),
      null,
    );
  });
});

describe("HTTP booking writes enforce minimumNotice", () => {
  it("create rejects inside notice and allows outside via the shared check", () => {
    const src = readFileSync("app/api/bookings/route.ts", "utf8");
    assert.match(src, /refuseWriteIfInsideMinimumNotice/);
    assert.match(src, /eventType\.minimumNotice/);
    assert.match(src, /notice\.status/);
    const create = src.slice(0, src.indexOf("return tx.booking.create"));
    assert.match(create, /refuseWriteIfInsideMinimumNotice/);
  });

  it("reschedule honors notice on the new start", () => {
    const src = readFileSync("app/api/bookings/reschedule/route.ts", "utf8");
    assert.match(src, /refuseWriteIfInsideMinimumNotice/);
    assert.match(src, /newStartTime/);
    assert.match(src, /eventType\.minimumNotice/);
    const beforeCreate = src.slice(0, src.indexOf("return tx.booking.create"));
    assert.match(beforeCreate, /refuseWriteIfInsideMinimumNotice/);
  });
});

describe("MCP create_booking enforces minimumNotice", () => {
  it("refuses inside notice before inserting a booking", () => {
    const src = readFileSync("lib/mcp/server.ts", "utf8");
    const start = src.indexOf('server.tool(\n    "create_booking"');
    assert.ok(start >= 0);
    const nextTool = src.indexOf("server.tool(", start + 1);
    const body = nextTool === -1 ? src.slice(start) : src.slice(start, nextTool);
    assert.match(body, /refuseWriteIfInsideMinimumNotice/);
    assert.match(body, /eventType\.minimumNotice/);
    const beforeCreate = body.slice(0, body.indexOf("tx.booking.create"));
    assert.match(beforeCreate, /refuseWriteIfInsideMinimumNotice/);
    assert.match(beforeCreate, /errorResponse\(notice\.error, true\)/);
  });
});
