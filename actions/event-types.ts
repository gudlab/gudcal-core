"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  eventTypeSchema,
  type EventTypeFormData,
} from "@/lib/validations/event-type";

export async function createEventType(data: EventTypeFormData) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const validated = eventTypeSchema.parse(data);

    // Check for slug uniqueness per user
    const existing = await prisma.eventType.findUnique({
      where: { userId_slug: { userId, slug: validated.slug } },
    });

    if (existing) {
      return {
        status: "error" as const,
        message: "You already have an event type with this URL slug",
      };
    }

    const eventType = await prisma.eventType.create({
      data: {
        userId,
        title: validated.title,
        slug: validated.slug,
        description: validated.description,
        duration: validated.duration,
        locationType: validated.locationType,
        locationValue: validated.locationValue,
        color: validated.color,
        bufferBefore: validated.bufferBefore,
        bufferAfter: validated.bufferAfter,
        maxBookingsPerDay: validated.maxBookingsPerDay,
        minimumNotice: validated.minimumNotice,
        requiresConfirmation: validated.requiresConfirmation,
        isActive: validated.isActive ?? true,
        availabilityId: validated.availabilityId,
        customQuestions: validated.customQuestions ?? undefined,
      },
    });

    revalidatePath("/dashboard/event-types");

    return { status: "success" as const, eventTypeId: eventType.id };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function updateEventType(
  eventTypeId: string,
  data: EventTypeFormData,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const validated = eventTypeSchema.parse(data);

    // Verify ownership
    const existing = await prisma.eventType.findFirst({
      where: { id: eventTypeId, userId },
    });

    if (!existing) {
      return { status: "error" as const, message: "Event type not found" };
    }

    // Check slug uniqueness (excluding self)
    if (validated.slug !== existing.slug) {
      const slugTaken = await prisma.eventType.findUnique({
        where: { userId_slug: { userId, slug: validated.slug } },
      });
      if (slugTaken) {
        return {
          status: "error" as const,
          message: "You already have an event type with this URL slug",
        };
      }
    }

    await prisma.eventType.update({
      where: { id: eventTypeId },
      data: {
        title: validated.title,
        slug: validated.slug,
        description: validated.description,
        duration: validated.duration,
        locationType: validated.locationType,
        locationValue: validated.locationValue,
        color: validated.color,
        bufferBefore: validated.bufferBefore,
        bufferAfter: validated.bufferAfter,
        maxBookingsPerDay: validated.maxBookingsPerDay,
        minimumNotice: validated.minimumNotice,
        requiresConfirmation: validated.requiresConfirmation,
        isActive: validated.isActive ?? existing.isActive,
        availabilityId: validated.availabilityId,
        customQuestions: validated.customQuestions ?? undefined,
      },
    });

    revalidatePath("/dashboard/event-types");
    revalidatePath(`/dashboard/event-types/${eventTypeId}`);

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function deleteEventType(eventTypeId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const existing = await prisma.eventType.findFirst({
      where: { id: eventTypeId, userId },
    });

    if (!existing) {
      return { status: "error" as const, message: "Event type not found" };
    }

    await prisma.eventType.delete({ where: { id: eventTypeId } });

    revalidatePath("/dashboard/event-types");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function toggleEventType(
  eventTypeId: string,
  isActive: boolean,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const existing = await prisma.eventType.findFirst({
      where: { id: eventTypeId, userId },
    });

    if (!existing) {
      return { status: "error" as const, message: "Event type not found" };
    }

    await prisma.eventType.update({
      where: { id: eventTypeId },
      data: { isActive },
    });

    revalidatePath("/dashboard/event-types");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function duplicateEventType(eventTypeId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const existing = await prisma.eventType.findFirst({
      where: { id: eventTypeId, userId },
    });

    if (!existing) {
      return { status: "error" as const, message: "Event type not found" };
    }

    // Generate a unique slug
    const baseSlug = `${existing.slug}-copy`;
    let slug = baseSlug;
    let counter = 1;
    while (
      await prisma.eventType.findUnique({
        where: { userId_slug: { userId, slug } },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newEventType = await prisma.eventType.create({
      data: {
        userId,
        title: `${existing.title} (Copy)`,
        slug,
        description: existing.description,
        duration: existing.duration,
        locationType: existing.locationType,
        locationValue: existing.locationValue,
        color: existing.color,
        bufferBefore: existing.bufferBefore,
        bufferAfter: existing.bufferAfter,
        maxBookingsPerDay: existing.maxBookingsPerDay,
        minimumNotice: existing.minimumNotice,
        requiresConfirmation: existing.requiresConfirmation,
        isActive: false, // Start as inactive
        availabilityId: existing.availabilityId,
        customQuestions: existing.customQuestions ?? undefined,
      },
    });

    revalidatePath("/dashboard/event-types");

    return { status: "success" as const, eventTypeId: newEventType.id };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}
