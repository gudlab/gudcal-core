"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  onboardingSchema,
  type OnboardingFormData,
} from "@/lib/validations/onboarding";

export async function completeOnboarding(data: OnboardingFormData) {
  try {
    const session = await auth();

    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    // Validate input
    const validated = onboardingSchema.parse(data);

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username: validated.username },
    });

    if (existingUser && existingUser.id !== userId) {
      return { status: "error" as const, message: "Username is already taken" };
    }

    // Transaction: update user + create default availability + rules
    await prisma.$transaction(async (tx) => {
      // 1. Update user with username and timezone
      await tx.user.update({
        where: { id: userId },
        data: {
          username: validated.username,
          timezone: validated.timezone,
        },
      });

      // 2. Create default availability schedule
      const availability = await tx.availability.create({
        data: {
          userId: userId,
          name: "Working Hours",
          isDefault: true,
          timezone: validated.timezone,
        },
      });

      // 3. Create availability rules for selected days
      if (validated.schedule.length > 0) {
        await tx.availabilityRule.createMany({
          data: validated.schedule.map((rule) => ({
            availabilityId: availability.id,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
          })),
        });
      }

      // 4. Create default event types (only if user has none)
      const existingEventTypes = await tx.eventType.count({
        where: { userId },
      });

      if (existingEventTypes === 0) {
        await tx.eventType.createMany({
          data: [
            {
              userId,
              title: "Quick Chat",
              slug: "quick-chat",
              description: "A quick 15-minute chat to connect.",
              duration: 15,
              locationType: "GOOGLE_MEET",
              color: "#3ECF8E",
              requiresConfirmation: false,
              isActive: true,
              bufferBefore: 0,
              bufferAfter: 5,
              minimumNotice: 120,
              availabilityId: availability.id,
            },
            {
              userId,
              title: "Meeting",
              slug: "meeting",
              description: "A standard 30-minute meeting.",
              duration: 30,
              locationType: "GOOGLE_MEET",
              color: "#0069FF",
              requiresConfirmation: false,
              isActive: true,
              bufferBefore: 0,
              bufferAfter: 0,
              minimumNotice: 120,
              availabilityId: availability.id,
            },
            {
              userId,
              title: "Private Consultation",
              slug: "consultation",
              description:
                "A 30-minute consultation. Requires host confirmation.",
              duration: 30,
              locationType: "GOOGLE_MEET",
              color: "#8B5CF6",
              requiresConfirmation: true,
              isActive: true,
              bufferBefore: 5,
              bufferAfter: 5,
              minimumNotice: 240,
              availabilityId: availability.id,
            },
          ],
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/event-types");
    revalidatePath("/onboarding");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function checkUsernameAvailability(username: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { available: false };
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    return {
      available: !existingUser || existingUser.id === userId,
    };
  } catch {
    return { available: false };
  }
}
