import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "prisma", "migrations");
const baselineName = "20261026120000_baseline";

describe("prisma baseline migration", () => {
  it("keeps a single baseline folder and a postgresql lockfile", () => {
    const folders = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    assert.deepEqual(folders, [baselineName]);

    const lock = readFileSync(join(migrationsDir, "migration_lock.toml"), "utf8");
    assert.match(lock, /provider\s*=\s*"postgresql"/);
  });

  it("creates the current scheduling tables and enums", () => {
    const sql = readFileSync(
      join(migrationsDir, baselineName, "migration.sql"),
      "utf8",
    );

    for (const table of [
      "event_types",
      "bookings",
      "calendar_connections",
      "availabilities",
      "availability_rules",
      "date_overrides",
      "organizations",
      "organization_members",
      "webhooks",
      "api_keys",
      "password_reset_tokens",
      "users",
      "accounts",
    ]) {
      assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
    }

    for (const name of [
      "BookingStatus",
      "EventLocationKind",
      "SchedulingKind",
      "CalendarProvider",
      "EventVisibility",
      "WebhookEvent",
      "UserRole",
      "OrgRole",
    ]) {
      assert.match(sql, new RegExp(`CREATE TYPE "${name}"`));
    }

    assert.doesNotMatch(sql, /accept-data-loss/i);
    assert.doesNotMatch(sql, /DROP DATABASE/i);
  });
});
