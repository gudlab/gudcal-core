import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  shouldShowGuestCancelSuccess,
  shouldStripCancelledQuery,
} from "./guest-cancel";

describe("guest cancel cache and success state", () => {
  it("force-dynamics the booking confirmation and cancel pages", () => {
    const confirmation = readFileSync(
      "app/(booking)/booking/[uid]/page.tsx",
      "utf8",
    );
    const cancel = readFileSync(
      "app/(booking)/booking/[uid]/cancel/page.tsx",
      "utf8",
    );
    assert.match(confirmation, /export const dynamic = "force-dynamic"/);
    assert.match(cancel, /export const dynamic = "force-dynamic"/);
  });

  it("revalidates guest booking paths after cancelBookingAsGuest", () => {
    const src = readFileSync("actions/bookings.ts", "utf8");
    const guestFn = src.slice(src.indexOf("export async function cancelBookingAsGuest"));
    const nextExport = guestFn.indexOf("\nexport async function ", 1);
    const body = nextExport === -1 ? guestFn : guestFn.slice(0, nextExport);
    assert.match(body, /revalidatePath\(`\/booking\/\$\{bookingUid\}`\)/);
    assert.match(body, /revalidatePath\(`\/booking\/\$\{bookingUid\}\/cancel`\)/);
  });

  it("does not show success for CONFIRMED + ?cancelled=1", () => {
    assert.equal(shouldShowGuestCancelSuccess("CONFIRMED"), false);
    assert.equal(shouldStripCancelledQuery("CONFIRMED", "1"), true);
    assert.equal(shouldStripCancelledQuery("PENDING", "true"), true);

    const cancel = readFileSync(
      "app/(booking)/booking/[uid]/cancel/page.tsx",
      "utf8",
    );
    assert.match(cancel, /shouldShowGuestCancelSuccess\(booking\.status\)/);
    assert.match(cancel, /shouldStripCancelledQuery\(booking\.status, cancelled\)/);
    assert.doesNotMatch(cancel, /status === "CANCELLED" \|\| justCancelled/);
  });

  it("shows success only when DB status is CANCELLED", () => {
    assert.equal(shouldShowGuestCancelSuccess("CANCELLED"), true);
    assert.equal(shouldStripCancelledQuery("CANCELLED", "1"), false);
    assert.equal(shouldStripCancelledQuery("CANCELLED"), false);

    const cancel = readFileSync(
      "app/(booking)/booking/[uid]/cancel/page.tsx",
      "utf8",
    );
    assert.match(cancel, /GuestCancelSuccess/);
    assert.doesNotMatch(cancel, /Booking Already Cancelled/);
  });

  it("keeps client success after a successful cancel action", () => {
    const form = readFileSync(
      "components/bookings/guest-cancel-form.tsx",
      "utf8",
    );
    assert.match(form, /result\?\.status === "success"/);
    assert.match(form, /setCancelled\(true\)/);
    assert.doesNotMatch(form, /initialCancelled/);
    assert.match(form, /export function GuestCancelSuccess/);
  });
});
