import { prisma } from "@/lib/db";

export type UserByIdResult<T> =
  | { status: "found"; user: T }
  | { status: "not_found" }
  | { status: "error"; name: string };

/** Map a caught lookup failure. Never treat DB errors as not-found. */
export function userByIdFromCaughtError(error: unknown): {
  status: "error";
  name: string;
} {
  return {
    status: "error",
    name: error instanceof Error ? error.name : "unknown",
  };
}

export const getUserByEmail = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        name: true,
        emailVerified: true,
      },
    });

    return user;
  } catch {
    return null;
  }
};

export const getUserById = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { status: "not_found" as const };
    return { status: "found" as const, user };
  } catch (error) {
    return userByIdFromCaughtError(error);
  }
};

export const getUserByUsername = async (username: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        timezone: true,
      },
    });

    return user;
  } catch {
    return null;
  }
};
