import authConfig from "@/auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";

import { applyTokenToSession, jwtFromLookup } from "@/lib/auth-jwt";
import { prisma } from "@/lib/db";
import { getUserById } from "@/lib/user";
import { UserRole } from "@/app/generated/prisma/client";

// More info: https://authjs.dev/getting-started/typescript#module-augmentation
declare module "next-auth" {
  interface Session {
    user: {
      role: UserRole;
      username: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    username: string | null;
  }
}

export const { handlers, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ token, session }) {
      return applyTokenToSession(token, session) as typeof session;
    },

    async jwt({ token }) {
      if (!token.sub) return null;

      return jwtFromLookup(token, await getUserById(token.sub));
    },
  },
  ...authConfig,
});
