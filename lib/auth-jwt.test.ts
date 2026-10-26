import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  applyTokenToSession,
  jwtForDbUser,
  jwtFromLookup,
  logJwtUserLookupFailed,
} from "./auth-jwt";

const liveToken = {
  sub: "user_live",
  name: "Old Name",
  email: "old@example.com",
  picture: "https://old",
  role: "USER",
  username: "old",
};

const liveUser = {
  name: "Pat",
  email: "pat@example.com",
  image: "https://img",
  role: "USER",
  username: "pat",
};

describe("jwtFromLookup", () => {
  it("keeps the existing token when user lookup errors", () => {
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      const next = jwtFromLookup(liveToken, {
        status: "error",
        name: "PrismaClientKnownRequestError",
      });
      assert.equal(next, liveToken);
      assert.equal(next?.sub, "user_live");
      assert.equal(next?.email, "old@example.com");
    } finally {
      console.error = original;
    }
    assert.equal(errors.length, 1);
    const payload = (errors[0] as unknown[])[1] as {
      userId: string;
      name: string;
    };
    assert.equal(payload.userId, "user_live");
    assert.equal(payload.name, "PrismaClientKnownRequestError");
    assert.deepEqual(Object.keys(payload).sort(), ["name", "userId"]);
    assert.doesNotMatch(JSON.stringify(payload), /password|secret|DATABASE/i);
  });

  it("invalidates only a confirmed not-found user", () => {
    assert.equal(jwtFromLookup(liveToken, { status: "not_found" }), null);
  });

  it("refreshes claims when the user is found", () => {
    const next = jwtFromLookup(liveToken, { status: "found", user: liveUser });
    assert.ok(next);
    assert.equal(next.name, "Pat");
    assert.equal(next.email, "pat@example.com");
    assert.equal(next.picture, "https://img");
    assert.equal(next.role, "USER");
    assert.equal(next.username, "pat");
  });
});

describe("jwtForDbUser", () => {
  it("returns null for a deleted user so the session is empty", () => {
    assert.equal(jwtForDbUser(liveToken, null), null);
  });

  it("refreshes claims for a normal user and leaves the token valid", () => {
    const next = jwtForDbUser(liveToken, liveUser);
    assert.ok(next);
    assert.equal(next.sub, "user_live");
    assert.equal(next.name, "Pat");
    assert.equal(next.email, "pat@example.com");
    assert.equal(next.picture, "https://img");
    assert.equal(next.username, "pat");
    assert.equal(next.role, "USER");
  });
});

describe("applyTokenToSession", () => {
  it("clears the session user when the token is invalidated", () => {
    const session = applyTokenToSession(null, {
      user: { id: "user_live", email: "old@example.com" },
    });
    assert.equal(session.user, undefined);
  });

  it("copies refreshed claims onto the session user", () => {
    const token = jwtForDbUser(liveToken, liveUser);
    const session = applyTokenToSession(token, {
      user: { id: "stale", email: "stale@example.com" },
    });
    assert.equal(session.user?.id, "user_live");
    assert.equal(session.user?.email, "pat@example.com");
    assert.equal(session.user?.name, "Pat");
    assert.equal(session.user?.image, "https://img");
    assert.equal(session.user?.username, "pat");
    assert.equal(session.user?.role, "USER");
  });
});

describe("auth wiring", () => {
  it("jwt callback uses lookup result and does not treat errors as null", () => {
    const auth = readFileSync("auth.ts", "utf8");
    assert.match(auth, /jwtFromLookup/);
    assert.match(auth, /getUserById\(token\.sub\)/);
    assert.match(auth, /applyTokenToSession/);
    assert.doesNotMatch(auth, /if \(!dbUser\) return token/);
  });

  it("getUserById does not turn DB errors into null", () => {
    const src = readFileSync("lib/user.ts", "utf8");
    const start = src.indexOf("export const getUserById");
    const next = src.indexOf("export const getUserByUsername");
    const body = src.slice(start, next);
    assert.match(body, /userByIdFromCaughtError/);
    assert.match(body, /status: "not_found"/);
    assert.doesNotMatch(body, /return null/);
  });

  it("structured lookup-error log has no secret fields", () => {
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      logJwtUserLookupFailed("user_live", "Error");
    } finally {
      console.error = original;
    }
    const logged = JSON.stringify(errors);
    assert.doesNotMatch(
      logged,
      /password|secret|DATABASE_URL|postgresql:\/\//i,
    );
  });
});
