import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("multi-calendar + TimeOff schema", () => {
  it("lifts the one-connection-per-provider unique and adds includeInBusyCheck", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    assert.doesNotMatch(schema, /@@unique\(\[userId, provider\]\)/);
    assert.match(schema, /includeInBusyCheck\s+Boolean\s+@default\(true\)/);
    assert.match(schema, /@@index\(\[userId, provider\]\)/);
    assert.match(schema, /@@index\(\[userId, isPrimary\]\)/);
    assert.match(schema, /model TimeOff/);
    assert.match(schema, /enum TimeOffLabel/);
    assert.match(schema, /@@map\("time_offs"\)/);
  });

  it("ships an additive forward migration after the baseline", () => {
    const sql = readFileSync(
      "prisma/migrations/20261026143000_multi_calendar_and_time_off/migration.sql",
      "utf8",
    );
    assert.match(sql, /ADD COLUMN IF NOT EXISTS "includeInBusyCheck"/);
    assert.match(sql, /DROP INDEX IF EXISTS "calendar_connections_userId_provider_key"/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "time_offs"/);
    assert.match(sql, /CREATE TYPE "TimeOffLabel"/);
    assert.doesNotMatch(sql, /migrate reset/i);
    assert.doesNotMatch(sql, /--accept-data-loss/);
    assert.doesNotMatch(sql, /DROP TABLE/);
  });
});

describe("Google busy honors includeInBusyCheck", () => {
  it("queries only selected Google connections", () => {
    const src = readFileSync("lib/calendar/google.ts", "utf8");
    assert.match(src, /includeInBusyCheck: true/);
    assert.match(src, /saveCalendarConnection/);
    assert.match(src, /prompt: "select_account consent"/);
    assert.match(src, /getPrimaryWriteConnection/);
    assert.match(src, /tryEventConnections/);
  });
});
