"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { UserRole } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/db";
import { userRoleSchema } from "@/lib/validations/user";

export type FormData = {
  role: UserRole;
};

export async function updateUserRole(userId: string, data: FormData) {
  try {
    const session = await auth();

    // Only admins can change user roles
    if (!session?.user || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    // Prevent admins from demoting themselves
    if (session.user.id === userId) {
      throw new Error("Cannot change your own role");
    }

    const { role } = userRoleSchema.parse(data);

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: role,
      },
    });

    revalidatePath("/admin");
    return { status: "success" };
  } catch (error) {
    return { status: "error" };
  }
}
