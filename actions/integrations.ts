"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function disconnectCalendar(provider: "GOOGLE" | "OUTLOOK") {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    await prisma.calendarConnection.deleteMany({
      where: { userId, provider },
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
