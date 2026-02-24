"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { userBioSchema } from "@/lib/validations/user";

export type BioFormData = {
  bio: string;
};

export async function updateBio(userId: string, data: BioFormData) {
  try {
    const session = await auth();

    if (!session?.user || session?.user.id !== userId) {
      throw new Error("Unauthorized");
    }

    const { bio } = userBioSchema.parse(data);

    await prisma.user.update({
      where: { id: userId },
      data: { bio: bio || null },
    });

    revalidatePath("/dashboard/profile");
    return { status: "success" };
  } catch {
    return { status: "error" };
  }
}
