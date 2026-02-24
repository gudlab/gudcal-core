"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  type CreateOrganizationFormData,
  type UpdateOrganizationFormData,
} from "@/lib/validations/organization";

export async function createOrganization(data: CreateOrganizationFormData) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const validated = createOrganizationSchema.parse(data);

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({
      where: { slug: validated.slug },
    });
    if (existing) {
      return { status: "error" as const, message: "This slug is already taken" };
    }

    const org = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: validated.name,
          slug: validated.slug,
        },
      });

      // Add creator as OWNER
      await tx.organizationMember.create({
        data: {
          userId,
          orgId: organization.id,
          role: "OWNER",
        },
      });

      return organization;
    });

    revalidatePath("/dashboard");

    return { status: "success" as const, orgSlug: org.slug };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function updateOrganization(
  orgId: string,
  data: UpdateOrganizationFormData,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    // Verify user is OWNER or ADMIN
    const member = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!member || member.role === "MEMBER") {
      return { status: "error" as const, message: "Insufficient permissions" };
    }

    const validated = updateOrganizationSchema.parse(data);

    if (validated.slug) {
      const existing = await prisma.organization.findFirst({
        where: { slug: validated.slug, id: { not: orgId } },
      });
      if (existing) {
        return { status: "error" as const, message: "This slug is already taken" };
      }
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.slug && { slug: validated.slug }),
      },
    });

    revalidatePath(`/org`);

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function inviteMember(orgId: string, email: string, role: "ADMIN" | "MEMBER") {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    // Verify user is OWNER or ADMIN
    const member = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!member || member.role === "MEMBER") {
      return { status: "error" as const, message: "Insufficient permissions" };
    }

    // Find user by email
    const invitee = await prisma.user.findUnique({
      where: { email },
    });
    if (!invitee) {
      return { status: "error" as const, message: "User not found. They must create an account first." };
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId: invitee.id, orgId } },
    });
    if (existingMember) {
      return { status: "error" as const, message: "User is already a member" };
    }

    await prisma.organizationMember.create({
      data: {
        userId: invitee.id,
        orgId,
        role,
      },
    });

    // TODO: Send invitation email

    revalidatePath(`/org`);

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function removeMember(orgId: string, memberUserId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    // Verify user is OWNER or ADMIN
    const currentMember = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!currentMember || currentMember.role === "MEMBER") {
      return { status: "error" as const, message: "Insufficient permissions" };
    }

    // Can't remove the owner
    const targetMember = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId: memberUserId, orgId } },
    });
    if (!targetMember) {
      return { status: "error" as const, message: "Member not found" };
    }
    if (targetMember.role === "OWNER") {
      return { status: "error" as const, message: "Cannot remove the organization owner" };
    }

    // Admin can't remove another admin (only owner can)
    if (targetMember.role === "ADMIN" && currentMember.role !== "OWNER") {
      return { status: "error" as const, message: "Only the owner can remove admins" };
    }

    await prisma.organizationMember.delete({
      where: { id: targetMember.id },
    });

    revalidatePath(`/org`);

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function updateMemberRole(
  orgId: string,
  memberUserId: string,
  newRole: "ADMIN" | "MEMBER",
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    // Only OWNER can change roles
    const currentMember = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!currentMember || currentMember.role !== "OWNER") {
      return { status: "error" as const, message: "Only the owner can change roles" };
    }

    const targetMember = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId: memberUserId, orgId } },
    });
    if (!targetMember) {
      return { status: "error" as const, message: "Member not found" };
    }
    if (targetMember.role === "OWNER") {
      return { status: "error" as const, message: "Cannot change the owner's role" };
    }

    await prisma.organizationMember.update({
      where: { id: targetMember.id },
      data: { role: newRole },
    });

    revalidatePath(`/org`);

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function deleteOrganization(orgId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    // Only OWNER can delete
    const member = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!member || member.role !== "OWNER") {
      return { status: "error" as const, message: "Only the owner can delete the organization" };
    }

    await prisma.organization.delete({ where: { id: orgId } });

    revalidatePath("/dashboard");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function leaveOrganization(orgId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const member = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!member) {
      return { status: "error" as const, message: "You are not a member" };
    }
    if (member.role === "OWNER") {
      return { status: "error" as const, message: "The owner cannot leave. Transfer ownership or delete the organization." };
    }

    await prisma.organizationMember.delete({
      where: { id: member.id },
    });

    revalidatePath("/dashboard");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}
