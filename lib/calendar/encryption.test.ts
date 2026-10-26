import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decrypt, encrypt, getEncryptionKey } from "./encryption";

const VALID_KEY = "a".repeat(64);

function withEnv(
  value: string | undefined,
  fn: () => void,
): void {
  const previous = process.env.ENCRYPTION_KEY;
  if (value === undefined) {
    delete process.env.ENCRYPTION_KEY;
  } else {
    process.env.ENCRYPTION_KEY = value;
  }
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = previous;
    }
  }
}

describe("getEncryptionKey", () => {
  it("throws a clear error when ENCRYPTION_KEY is unset", () => {
    withEnv(undefined, () => {
      assert.throws(
        () => getEncryptionKey(),
        /ENCRYPTION_KEY is not set/,
      );
    });
  });

  it("throws when ENCRYPTION_KEY is blank", () => {
    withEnv("   ", () => {
      assert.throws(
        () => getEncryptionKey(),
        /ENCRYPTION_KEY is not set/,
      );
    });
  });

  it("throws when ENCRYPTION_KEY is not 64 hex characters", () => {
    withEnv("not-a-key", () => {
      assert.throws(
        () => getEncryptionKey(),
        /64 hexadecimal characters/,
      );
    });
  });

  it("accepts a persistent 64-character hex key", () => {
    withEnv(VALID_KEY, () => {
      const key = getEncryptionKey();
      assert.equal(key.length, 32);
    });
  });
});

describe("encrypt/decrypt", () => {
  it("round-trips a token with a configured key", () => {
    withEnv(VALID_KEY, () => {
      const encrypted = encrypt("oauth-token");
      assert.notEqual(encrypted, "oauth-token");
      assert.equal(decrypt(encrypted), "oauth-token");
    });
  });

  it("does not mint a random key when ENCRYPTION_KEY is missing", () => {
    withEnv(undefined, () => {
      assert.throws(() => encrypt("oauth-token"), /ENCRYPTION_KEY is not set/);
    });
  });
});
