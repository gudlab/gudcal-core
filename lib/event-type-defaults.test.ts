import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  DEFAULT_MINIMUM_NOTICE_MINUTES,
  MINIMUM_NOTICE_HELPER_TEXT,
  defaultEventTypeValues,
} from "./validations/event-type";

describe("new event type minimumNotice default", () => {
  it("is 60 minutes for new event types", () => {
    assert.equal(DEFAULT_MINIMUM_NOTICE_MINUTES, 60);
    assert.equal(defaultEventTypeValues.minimumNotice, 60);
  });

  it("is used on onboarding and v1 create paths", () => {
    const onboarding = readFileSync("actions/onboarding.ts", "utf8");
    assert.match(onboarding, /DEFAULT_MINIMUM_NOTICE_MINUTES/);
    assert.doesNotMatch(onboarding, /minimumNotice:\s*120/);

    const v1 = readFileSync("app/api/v1/event-types/route.ts", "utf8");
    assert.match(v1, /DEFAULT_MINIMUM_NOTICE_MINUTES/);
    assert.doesNotMatch(v1, /minimumNotice\s*=\s*120/);
  });

  it("MCP create describes the 60-minute default and omits the field when unset", () => {
    const mcp = readFileSync("lib/mcp/server.ts", "utf8");
    const start = mcp.indexOf('server.tool(\n    "create_event_type"');
    assert.ok(start >= 0);
    const nextTool = mcp.indexOf("server.tool(", start + 1);
    const body = nextTool === -1 ? mcp.slice(start) : mcp.slice(start, nextTool);
    assert.match(
      body,
      /Minimum advance notice in minutes \(default: 60\)/,
    );
    assert.doesNotMatch(
      body,
      /Minimum advance notice in minutes \(default: 120\)/,
    );
    assert.match(body, /\.\.\.rest/);
    assert.doesNotMatch(body, /minimumNotice:\s*120/);
  });

  it("API docs list the create default as 60 minutes", () => {
    const docs = readFileSync("content/docs/api.mdx", "utf8");
    assert.match(
      docs,
      /Minimum advance notice in minutes \(default: 60\)/,
    );
    assert.doesNotMatch(
      docs,
      /Minimum advance notice in minutes \(default: 120\)/,
    );
  });

  it("schema default is 60 minutes for new rows only (no data rewrite)", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    assert.match(schema, /minimumNotice\s+Int\s+@default\(60\)/);
    assert.doesNotMatch(schema, /minimumNotice\s+Int\s+@default\(120\)/);

    const migrationsDir = join("prisma", "migrations");
    const folders = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const folder of folders) {
      const sql = readFileSync(
        join(migrationsDir, folder, "migration.sql"),
        "utf8",
      );
      assert.doesNotMatch(sql, /UPDATE\s+"event_types"/i);
      assert.doesNotMatch(sql, /migrate reset/i);
      assert.doesNotMatch(sql, /--accept-data-loss/);
    }

    const defaultMigration = folders.find((name) =>
      name.includes("minimum_notice_default_60"),
    );
    assert.ok(defaultMigration);
    const defaultSql = readFileSync(
      join(migrationsDir, defaultMigration, "migration.sql"),
      "utf8",
    );
    assert.match(
      defaultSql,
      /ALTER TABLE "event_types" ALTER COLUMN "minimumNotice" SET DEFAULT 60/,
    );
    assert.doesNotMatch(defaultSql, /SET\s+"minimumNotice"\s*=/i);
  });
});

describe("event-type form minimumNotice field", () => {
  it("is visible, editable, and has helper text", () => {
    const form = readFileSync(
      "components/event-types/event-type-form.tsx",
      "utf8",
    );
    assert.match(form, /htmlFor="minimumNotice"/);
    assert.match(form, /MINIMUM_NOTICE_HELPER_TEXT/);
    assert.match(form, /setValue\("minimumNotice"/);
    assert.equal(
      MINIMUM_NOTICE_HELPER_TEXT.includes("book at least this far in advance"),
      true,
    );
  });
});
