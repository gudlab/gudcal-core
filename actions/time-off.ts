"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { cancelBooking } from "@/actions/bookings";
import { prisma } from "@/lib/db";
import {
  activeBookingOverlapWhere,
  resolveTimeOffRange,
} from "@/lib/time-off";
import {
  timeOffSchema,
  type TimeOffFormData,
} from "@/lib/validations/time-off";

export type TimeOffOverlapBooking = {
  id: string;
  guestName: string;
  startTime: string;
  endTime: string;
  eventTitle: string;
};

function revalidateTimeOffPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard/bookings");
}

export async function listTimeOff() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { status: "error" as const, message: "Not authenticated" };
  }

  const timeOffs = await prisma.timeOff.findMany({
    where: { userId },
    orderBy: { startAt: "asc" },
  });

  return { status: "success" as const, timeOffs };
}

export async function createTimeOff(data: TimeOffFormData) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const parsed = timeOffSchema.safeParse(data);
    if (!parsed.success) {
      return { status: "error" as const, message: "Invalid time off" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    if (!user) {
      return { status: "error" as const, message: "User not found" };
    }

    const range = resolveTimeOffRange({
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      allDay: parsed.data.allDay,
      timezone: user.timezone,
    });

    const overlapping = await prisma.booking.findMany({
      where: activeBookingOverlapWhere(userId, range.startAt, range.endAt),
      include: {
        eventType: { select: { title: true } },
      },
      orderBy: { startTime: "asc" },
    });

    if (overlapping.length > 0 && !parsed.data.cancelOverlapping) {
      const bookings: TimeOffOverlapBooking[] = overlapping.map((booking) => ({
        id: booking.id,
        guestName: booking.guestName,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        eventTitle: booking.eventType.title,
      }));
      return { status: "overlap" as const, bookings };
    }

    if (overlapping.length > 0 && parsed.data.cancelOverlapping) {
      for (const booking of overlapping) {
        const result = await cancelBooking(
          booking.id,
          "Cancelled because it overlapped a new time-off block",
        );
        if (result.status !== "success") {
          return {
            status: "error" as const,
            message: result.message ?? "Could not cancel an overlapping booking",
          };
        }
      }
    }

    const timeOff = await prisma.timeOff.create({
      data: {
        userId,
        startAt: range.startAt,
        endAt: range.endAt,
        allDay: parsed.data.allDay,
        reason: parsed.data.reason?.trim() || null,
        label: parsed.data.label,
      },
    });

    revalidateTimeOffPaths();

    return { status: "success" as const, timeOffId: timeOff.id };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function deleteTimeOff(timeOffId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const existing = await prisma.timeOff.findFirst({
      where: { id: timeOffId, userId },
    });

    if (!existing) {
      return { status: "error" as const, message: "Time off not found" };
    }

    await prisma.timeOff.delete({ where: { id: timeOffId } });

    revalidateTimeOffPaths();

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}
