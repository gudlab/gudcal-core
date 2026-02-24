"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  availabilitySchema,
  updateAvailabilitySchema,
  type AvailabilityFormData,
  type UpdateAvailabilityFormData,
} from "@/lib/validations/availability";

export async function createAvailability(data: AvailabilityFormData) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const validated = availabilitySchema.parse(data);

    const availability = await prisma.$transaction(async (tx) => {
      // If this is the user's first schedule, make it default
      const existingCount = await tx.availability.count({
        where: { userId },
      });

      const schedule = await tx.availability.create({
        data: {
          userId,
          name: validated.name,
          timezone: validated.timezone,
          isDefault: existingCount === 0,
        },
      });

      // Create availability rules
      if (validated.rules.length > 0) {
        await tx.availabilityRule.createMany({
          data: validated.rules.map((rule) => ({
            availabilityId: schedule.id,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
          })),
        });
      }

      return schedule;
    });

    revalidatePath("/dashboard/availability");

    return { status: "success" as const, availabilityId: availability.id };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function updateAvailability(
  availabilityId: string,
  data: UpdateAvailabilityFormData,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const validated = updateAvailabilitySchema.parse(data);

    // Verify ownership
    const existing = await prisma.availability.findFirst({
      where: { id: availabilityId, userId },
    });

    if (!existing) {
      return { status: "error" as const, message: "Availability not found" };
    }

    await prisma.$transaction(async (tx) => {
      // Update the schedule itself
      await tx.availability.update({
        where: { id: availabilityId },
        data: {
          name: validated.name,
          timezone: validated.timezone,
        },
      });

      // Replace all rules: delete existing, create new
      await tx.availabilityRule.deleteMany({
        where: { availabilityId },
      });

      if (validated.rules.length > 0) {
        await tx.availabilityRule.createMany({
          data: validated.rules.map((rule) => ({
            availabilityId,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
          })),
        });
      }

      // Manage date overrides if provided
      if (validated.dateOverrides) {
        await tx.dateOverride.deleteMany({
          where: { availabilityId },
        });

        if (validated.dateOverrides.length > 0) {
          await tx.dateOverride.createMany({
            data: validated.dateOverrides.map((override) => ({
              availabilityId,
              date: new Date(override.date),
              startTime: override.startTime ?? null,
              endTime: override.endTime ?? null,
              isBlocked: override.isBlocked,
            })),
          });
        }
      }
    });

    revalidatePath("/dashboard/availability");
    revalidatePath(`/dashboard/availability/${availabilityId}`);

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function deleteAvailability(availabilityId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    // Verify ownership
    const existing = await prisma.availability.findFirst({
      where: { id: availabilityId, userId },
    });

    if (!existing) {
      return { status: "error" as const, message: "Availability not found" };
    }

    // Prevent deleting the only schedule
    const totalCount = await prisma.availability.count({
      where: { userId },
    });

    if (totalCount <= 1) {
      return {
        status: "error" as const,
        message: "You must have at least one availability schedule",
      };
    }

    // Check if any event types are using this schedule
    const linkedEventTypes = await prisma.eventType.count({
      where: { availabilityId },
    });

    if (linkedEventTypes > 0) {
      return {
        status: "error" as const,
        message:
          "This schedule is assigned to event types. Reassign them before deleting.",
      };
    }

    await prisma.availability.delete({ where: { id: availabilityId } });

    // If we deleted the default, promote another schedule to default
    if (existing.isDefault) {
      const nextSchedule = await prisma.availability.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });

      if (nextSchedule) {
        await prisma.availability.update({
          where: { id: nextSchedule.id },
          data: { isDefault: true },
        });
      }
    }

    revalidatePath("/dashboard/availability");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function setDefaultAvailability(availabilityId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    // Verify ownership
    const existing = await prisma.availability.findFirst({
      where: { id: availabilityId, userId },
    });

    if (!existing) {
      return { status: "error" as const, message: "Availability not found" };
    }

    if (existing.isDefault) {
      return { status: "success" as const }; // Already default
    }

    await prisma.$transaction([
      // Unset current default
      prisma.availability.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      // Set new default
      prisma.availability.update({
        where: { id: availabilityId },
        data: { isDefault: true },
      }),
    ]);

    revalidatePath("/dashboard/availability");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}
