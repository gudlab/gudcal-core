/**
 * JWT / session helpers for Auth.js.
 * The jwt callback already loads the user row; these decide whether that
 * token may become a session. No extra DB reads.
 */

export type AuthJwtToken = {
  sub?: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  role?: string;
  username?: string | null;
};

export type AuthDbUser = {
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  username: string | null;
};

export type UserLookupResult<U extends AuthDbUser = AuthDbUser> =
  | { status: "found"; user: U }
  | { status: "not_found" }
  | { status: "error"; name: string };

export function logJwtUserLookupFailed(userId: string, name: string): void {
  console.error("auth.jwt.user_lookup_failed", { userId, name });
}

/**
 * Apply a getUserById-style lookup to the JWT.
 * Confirmed not-found → invalidate. Lookup error → keep the existing token.
 */
export function jwtFromLookup<T extends AuthJwtToken>(
  token: T,
  lookup: UserLookupResult,
): T | null {
  if (!token.sub) return null;
  if (lookup.status === "error") {
    logJwtUserLookupFailed(token.sub, lookup.name);
    return token;
  }
  if (lookup.status === "not_found") return null;
  return jwtForDbUser(token, lookup.user);
}

/** Return null only for a confirmed missing user. */
export function jwtForDbUser<T extends AuthJwtToken>(
  token: T,
  dbUser: AuthDbUser | null,
): T | null {
  if (!token.sub) return null;
  if (!dbUser) return null;

  return {
    ...token,
    name: dbUser.name,
    email: dbUser.email,
    picture: dbUser.image,
    role: dbUser.role,
    username: dbUser.username,
  };
}

export type SessionUserFields = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string;
  username?: string | null;
};

export function applyTokenToSession<
  S extends { user?: SessionUserFields | null },
>(token: AuthJwtToken | null | undefined, session: S): S {
  if (!token?.sub || !session.user) {
    return { ...session, user: undefined } as S;
  }

  const user = session.user;
  user.id = token.sub;
  if (token.email) user.email = token.email;
  if (token.role) user.role = token.role;
  user.name = token.name;
  user.image = token.picture;
  user.username = token.username ?? null;
  return session;
}
