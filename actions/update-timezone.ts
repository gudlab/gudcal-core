"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { userTimezoneSchema } from "@/lib/validations/user";

export type TimezoneFormData = {
  timezone: string;
};

export async function updateTimezone(userId: string, data: TimezoneFormData) {
  try {
    const session = await auth();

    if (!session?.user || session?.user.id !== userId) {
      throw new Error("Unauthorized");
    }

    const { timezone } = userTimezoneSchema.parse(data);

    // Update user timezone and also update default availability timezone
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { timezone },
      }),
      prisma.availability.updateMany({
        where: { userId, isDefault: true },
        data: { timezone },
      }),
    ]);

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/availability");
    return { status: "success" };
  } catch {
    return { status: "error" };
  }
}
