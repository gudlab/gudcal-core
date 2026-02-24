"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { webhookSchema, type WebhookFormData } from "@/lib/validations/webhook";

export async function createWebhook(data: WebhookFormData) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const validated = webhookSchema.parse(data);

    const secret = `whsec_${randomBytes(32).toString("hex")}`;

    const webhook = await prisma.webhook.create({
      data: {
        userId,
        url: validated.url,
        events: validated.events as any[],
        secret,
      },
    });

    revalidatePath("/dashboard/integrations");

    return { status: "success" as const, secret, webhookId: webhook.id };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function deleteWebhook(webhookId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) {
      return { status: "error" as const, message: "Webhook not found" };
    }

    await prisma.webhook.delete({ where: { id: webhookId } });

    revalidatePath("/dashboard/integrations");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function toggleWebhook(webhookId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) {
      return { status: "error" as const, message: "Webhook not found" };
    }

    await prisma.webhook.update({
      where: { id: webhookId },
      data: { isActive: !webhook.isActive },
    });

    revalidatePath("/dashboard/integrations");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}
