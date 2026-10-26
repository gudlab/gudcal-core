import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleResendSendResult, recipientDomain } from "./resend-result";

describe("recipientDomain", () => {
  it("returns only the domain, never the mailbox", () => {
    assert.equal(recipientDomain("timchosen@gmail.com"), "gmail.com");
    assert.equal(recipientDomain("user+tag@mailman.gudcal.com"), "mailman.gudcal.com");
    assert.equal(recipientDomain("no-at"), "unknown");
  });
});

describe("handleResendSendResult", () => {
  it("is a no-op when Resend returns no error", () => {
    handleResendSendResult({ error: null }, "a@b.co");
    handleResendSendResult({}, "a@b.co");
  });

  it("logs name/message and domain, then throws for password reset", () => {
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      assert.throws(
        () =>
          handleResendSendResult(
            { error: { name: "validation_error", message: "Invalid from" } },
            "guest@example.com",
            { throwOnError: true },
          ),
        /Invalid from/,
      );
    } finally {
      console.error = original;
    }
    assert.equal(errors.length, 1);
    const payload = (errors[0] as unknown[])[1] as {
      name: string;
      message: string;
      domain: string;
    };
    assert.equal(payload.name, "validation_error");
    assert.equal(payload.message, "Invalid from");
    assert.equal(payload.domain, "example.com");
    assert.doesNotMatch(JSON.stringify(payload), /guest@/);
  });

  it("logs without throwing for other send helpers", () => {
    const original = console.error;
    console.error = () => {};
    try {
      handleResendSendResult(
        { error: { name: "rate_limit", message: "slow down" } },
        "host@other.test",
      );
    } finally {
      console.error = original;
    }
  });
});
