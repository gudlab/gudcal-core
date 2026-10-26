import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canConsumeConnectionSlot } from "./calendar/connection-policy";
import { isSelfHosted, maxCalendarConnections } from "./self-host";

describe("self-host calendar caps", () => {
  it("defaults to self-hosted and uncapped calendar connections", () => {
    assert.equal(isSelfHosted(), true);
    assert.equal(maxCalendarConnections(), -1);
    assert.equal(canConsumeConnectionSlot(99, maxCalendarConnections(), false), true);
  });
});
