"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function createApiKey(name: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    // Generate a secure API key
    const key = `fc_${randomBytes(32).toString("hex")}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        key,
      },
    });

    revalidatePath("/dashboard/settings");

    // Return the key only once (it won't be shown again)
    return { status: "success" as const, key: apiKey.key, id: apiKey.id };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function deleteApiKey(keyId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      return { status: "error" as const, message: "API key not found" };
    }

    await prisma.apiKey.delete({ where: { id: keyId } });

    revalidatePath("/dashboard/settings");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function listApiKeys() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        key: true, // We'll mask this
        lastUsed: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Mask keys -- show only last 8 chars
    const masked = keys.map((k) => ({
      ...k,
      key: `fc_${"*".repeat(24)}${k.key.slice(-8)}`,
    }));

    return { status: "success" as const, keys: masked };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}
