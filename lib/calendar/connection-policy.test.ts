import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canConsumeConnectionSlot,
  isReconnectOfExisting,
  mergeBusyIntervals,
  normalizeCalendarEmail,
  pickPrimaryConnectionId,
  ProviderHttpError,
  tryEventConnections,
} from "./connection-policy";

describe("isReconnectOfExisting", () => {
  const existing = [{ provider: "GOOGLE", email: "work@gmail.com" }];

  it("reconnects Google only when the same email already exists", () => {
    assert.equal(
      isReconnectOfExisting(existing, "GOOGLE", "work@gmail.com"),
      true,
    );
    assert.equal(
      isReconnectOfExisting(existing, "GOOGLE", "personal@gmail.com"),
      false,
    );
    assert.equal(isReconnectOfExisting(existing, "GOOGLE"), false);
  });

  it("treats trimmed lowercase email as the same Google account", () => {
    assert.equal(
      isReconnectOfExisting(existing, "GOOGLE", "  Work@Gmail.com "),
      true,
    );
    assert.equal(
      isReconnectOfExisting(
        [{ provider: "GOOGLE", email: "  Work@Gmail.com " }],
        "GOOGLE",
        "work@gmail.com",
      ),
      true,
    );
  });
});

describe("canConsumeConnectionSlot", () => {
  it("treats -1 as unlimited and never consumes a slot for reconnects", () => {
    assert.equal(canConsumeConnectionSlot(40, -1, false), true);
    assert.equal(canConsumeConnectionSlot(1, 1, false), false);
    assert.equal(canConsumeConnectionSlot(1, 1, true), true);
  });
});

describe("pickPrimaryConnectionId", () => {
  const t = (iso: string) => new Date(iso);

  it("keeps a single marked primary", () => {
    assert.equal(
      pickPrimaryConnectionId([
        { id: "g1", provider: "GOOGLE", isPrimary: false, createdAt: t("2026-01-01") },
        { id: "g2", provider: "GOOGLE", isPrimary: true, createdAt: t("2026-01-02") },
      ]),
      "g2",
    );
  });

  it("picks the oldest writable row when none are marked", () => {
    assert.equal(
      pickPrimaryConnectionId([
        { id: "g2", provider: "GOOGLE", isPrimary: false, createdAt: t("2026-01-02") },
        { id: "g1", provider: "GOOGLE", isPrimary: false, createdAt: t("2026-01-01") },
      ]),
      "g1",
    );
  });
});

describe("mergeBusyIntervals", () => {
  it("unions overlapping busy ranges across calendars", () => {
    const a = { start: new Date("2026-10-07T10:00:00Z"), end: new Date("2026-10-07T11:00:00Z") };
    const b = { start: new Date("2026-10-07T10:30:00Z"), end: new Date("2026-10-07T12:00:00Z") };
    const merged = mergeBusyIntervals([a, b]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].start.toISOString(), "2026-10-07T10:00:00.000Z");
    assert.equal(merged[0].end.toISOString(), "2026-10-07T12:00:00.000Z");
  });

  it("collapses touching ranges so adjacent events stay one busy block", () => {
    const a = { start: new Date("2026-10-07T10:00:00Z"), end: new Date("2026-10-07T11:00:00Z") };
    const b = { start: new Date("2026-10-07T11:00:00Z"), end: new Date("2026-10-07T12:00:00Z") };
    const merged = mergeBusyIntervals([a, b]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].end.toISOString(), "2026-10-07T12:00:00.000Z");
  });
});

describe("normalizeCalendarEmail", () => {
  it("trims and lowercases, and maps empty to null", () => {
    assert.equal(normalizeCalendarEmail("  Work@Gmail.com "), "work@gmail.com");
    assert.equal(normalizeCalendarEmail("   "), null);
    assert.equal(normalizeCalendarEmail(null), null);
  });
});

describe("tryEventConnections", () => {
  const primary = { id: "conn_primary", provider: "GOOGLE" };
  const second = { id: "conn_second", provider: "GOOGLE" };

  it("falls through 404/410 to the next same-provider connection", async () => {
    const attempted: string[] = [];
    const result = await tryEventConnections([primary, second], async (connection) => {
      attempted.push(connection.id);
      if (connection.id === "conn_primary") {
        throw new ProviderHttpError(404);
      }
      return "deleted";
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.connection.id, "conn_second");
    }
    assert.deepEqual(attempted, ["conn_primary", "conn_second"]);
  });

  it("does not retry a non-404 error", async () => {
    const attempted: string[] = [];
    const result = await tryEventConnections([primary, second], async (connection) => {
      attempted.push(connection.id);
      throw new ProviderHttpError(500, "quota");
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "error");
    }
    assert.deepEqual(attempted, ["conn_primary"]);
  });
});
