import { NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/db";
import { sendOAuthSignInEmail, sendPasswordResetEmail } from "@/lib/emails";
import { env } from "@/env.mjs";
import {
  GENERIC_FORGOT_PASSWORD_MESSAGE,
  logForgotPasswordOutcome,
  readForgotPasswordBody,
  runForgotPassword,
} from "@/lib/forgot-password";

function forgotPasswordBaseUrl(): string {
  // Prefer runtime APP_URL. NEXT_PUBLIC_* is inlined at Next build time.
  return process.env.APP_URL?.trim() || env.NEXT_PUBLIC_APP_URL;
}

export async function POST(req: Request) {
  const parsed = await readForgotPasswordBody(req);
  if (!parsed.ok) {
    logForgotPasswordOutcome("bad_request");
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const outcome = await runForgotPassword(parsed.email, {
      findUser: (e) =>
        prisma.user.findUnique({
          where: { email: e },
          select: { email: true, name: true, password: true },
        }),
      deleteTokens: async (e) => {
        await prisma.passwordResetToken.deleteMany({ where: { email: e } });
      },
      createToken: async (data) => {
        await prisma.passwordResetToken.create({ data });
      },
      sendResetEmail: sendPasswordResetEmail,
      sendOAuthEmail: sendOAuthSignInEmail,
      baseUrl: forgotPasswordBaseUrl(),
      randomToken: () => crypto.randomBytes(32).toString("hex"),
    });

    logForgotPasswordOutcome(outcome);

    return NextResponse.json({
      message: GENERIC_FORGOT_PASSWORD_MESSAGE,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    logForgotPasswordOutcome("send_failed");
    return NextResponse.json({
      message: GENERIC_FORGOT_PASSWORD_MESSAGE,
    });
  }
}
