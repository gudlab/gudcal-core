"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { userUsernameSchema } from "@/lib/validations/user";

export type UsernameFormData = {
  username: string;
};

export async function updateUsername(userId: string, data: UsernameFormData) {
  try {
    const session = await auth();

    if (!session?.user || session?.user.id !== userId) {
      throw new Error("Unauthorized");
    }

    const { username } = userUsernameSchema.parse(data);

    // Check if username is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser && existingUser.id !== userId) {
      return { status: "error", message: "This username is already taken" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { username },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { status: "success" };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { status: "error", message: "Unauthorized" };
    }
    return { status: "error", message: "Something went wrong" };
  }
}
