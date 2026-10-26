import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("guest timezone picker wiring", () => {
  it("exposes a grouped picker on the public booking widget", () => {
    const widget = readFileSync("components/booking/booking-widget.tsx", "utf8");
    const picker = readFileSync(
      "components/booking/guest-timezone-picker.tsx",
      "utf8",
    );
    const page = readFileSync(
      "app/(booking)/[username]/[eventSlug]/page.tsx",
      "utf8",
    );

    assert.match(picker, /getGroupedTimezones/);
    assert.match(picker, /aria-label="Timezone"/);
    assert.match(widget, /GuestTimezonePicker/);
    assert.match(widget, /handleTimezoneChange/);
    assert.match(widget, /resolveGuestTimeZone/);
    assert.match(widget, /guestTimezone,/);
    assert.match(page, /initialTimezone/);
    assert.match(page, /sp\.timezone/);
  });

  it("availability API uses guest TZ for omitted timezone and civil from/to", () => {
    const src = readFileSync(
      "app/api/availability/[username]/route.ts",
      "utf8",
    );
    assert.match(src, /resolveTimeZone\(searchParams\.get\("timezone"\)\)/);
    assert.match(src, /zonedStartOfDay\(dateFrom, guestTimezone\)/);
    assert.match(src, /zonedEndOfDay\(dateTo, guestTimezone\)/);
    assert.match(src, /isoSlotsByGuestDate\(daySlots, guestTimezone\)/);
    assert.doesNotMatch(
      src,
      /searchParams\.get\("timezone"\)\s*\?\?\s*"America\/New_York"/,
    );
  });

  it("MCP get_availability uses the same guest-TZ bounds", () => {
    const src = readFileSync("lib/mcp/server.ts", "utf8");
    const start = src.indexOf('server.tool(\n    "get_availability"');
    assert.ok(start >= 0);
    const nextTool = src.indexOf("server.tool(", start + 1);
    const body = nextTool === -1 ? src.slice(start) : src.slice(start, nextTool);
    assert.match(body, /resolveTimeZone\(timezone\)/);
    assert.match(body, /zonedStartOfDay\(dateFrom, guestTimezone\)/);
    assert.match(body, /groupSlotsByGuestDate/);
    assert.doesNotMatch(body, /fromZonedTime/);
    assert.doesNotMatch(body, /dateFrom \+ "T00:00:00"/);
  });

  it("created bookings persist the guest-chosen timezone", () => {
    const widget = readFileSync("components/booking/booking-widget.tsx", "utf8");
    const api = readFileSync("app/api/bookings/route.ts", "utf8");
    assert.match(widget, /guestTimezone,/);
    assert.match(api, /guestTimezone: z\.string\(\)\.min\(1\)\.max\(100\)/);
    assert.match(api, /guestTimezone,/);
    const create = api.slice(api.indexOf("return tx.booking.create"));
    assert.match(create, /guestTimezone,/);
  });
});
