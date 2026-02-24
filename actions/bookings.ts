"use server";

import { revalidatePath } from "next/cache";
import { addMinutes } from "date-fns";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  buildBookingEmailData,
  sendBookingConfirmation,
  sendBookingCancellation,
} from "@/lib/emails";
import {
  createCalendarEventForBooking,
  deleteCalendarEventForBooking,
} from "@/lib/calendar/google";

type BookingFilter = "upcoming" | "past" | "cancelled" | "pending";

export async function getBookings(filter: BookingFilter = "upcoming") {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { status: "error" as const, message: "Not authenticated" };
  }

  const now = new Date();

  let where: any = { userId };

  switch (filter) {
    case "upcoming":
      where.startTime = { gte: now };
      where.status = { in: ["CONFIRMED", "PENDING"] };
      break;
    case "past":
      where.endTime = { lt: now };
      where.status = { in: ["CONFIRMED", "NO_SHOW"] };
      break;
    case "cancelled":
      where.status = "CANCELLED";
      break;
    case "pending":
      where.status = "PENDING";
      break;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      eventType: {
        select: { title: true, duration: true, color: true, locationType: true },
      },
    },
    orderBy: { startTime: filter === "past" ? "desc" : "asc" },
  });

  return { status: "success" as const, bookings };
}

export async function cancelBooking(bookingId: string, reason?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId },
    });

    if (!booking) {
      return { status: "error" as const, message: "Booking not found" };
    }

    if (booking.status === "CANCELLED") {
      return { status: "error" as const, message: "Booking is already cancelled" };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelReason: reason ?? null,
      },
      include: {
        eventType: { select: { title: true, locationValue: true } },
        host: { select: { name: true, email: true } },
      },
    });

    // Delete Google Calendar event (fire-and-forget)
    deleteCalendarEventForBooking(userId, updatedBooking.googleEventId).catch(() => {});

    // Send cancellation email (fire-and-forget)
    if (updatedBooking.host.email) {
      const emailData = buildBookingEmailData({
        ...updatedBooking,
        additionalGuests: updatedBooking.additionalGuests,
      });
      sendBookingCancellation(emailData).catch(() => {});
    }

    revalidatePath("/dashboard/bookings");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function confirmBooking(bookingId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId, status: "PENDING" },
    });

    if (!booking) {
      return { status: "error" as const, message: "Booking not found or not pending" };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
      include: {
        eventType: { select: { title: true, locationValue: true, locationType: true } },
        host: { select: { name: true, email: true } },
      },
    });

    // Create Google Calendar event (now that booking is confirmed)
    const calResult = await createCalendarEventForBooking(
      userId,
      updatedBooking,
      { title: updatedBooking.eventType.title, locationType: updatedBooking.eventType.locationType },
    );

    // Send confirmation email (fire-and-forget) — use updated location if Meet link was created
    if (updatedBooking.host.email) {
      const emailData = buildBookingEmailData({
        ...updatedBooking,
        location: calResult?.meetLink ?? updatedBooking.location,
        additionalGuests: updatedBooking.additionalGuests,
      });
      sendBookingConfirmation(emailData).catch(() => {});
    }

    revalidatePath("/dashboard/bookings");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function cancelBookingAsGuest(
  bookingUid: string,
  guestEmail: string,
  reason?: string,
) {
  try {
    if (!guestEmail) {
      return { status: "error" as const, message: "Email is required" };
    }

    const booking = await prisma.booking.findUnique({
      where: { uid: bookingUid },
    });

    if (!booking) {
      return { status: "error" as const, message: "Booking not found" };
    }

    // Verify the guest email matches the booking to prevent unauthorized cancellation
    if (booking.guestEmail.toLowerCase() !== guestEmail.toLowerCase()) {
      return { status: "error" as const, message: "Booking not found" };
    }

    if (booking.status === "CANCELLED") {
      return { status: "error" as const, message: "Booking is already cancelled" };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelReason: reason ?? null,
      },
      include: {
        eventType: { select: { title: true, locationValue: true } },
        host: { select: { name: true, email: true } },
      },
    });

    // Delete Google Calendar event (fire-and-forget)
    deleteCalendarEventForBooking(booking.userId, updatedBooking.googleEventId).catch(() => {});

    // Send cancellation email (fire-and-forget)
    if (updatedBooking.host.email) {
      const emailData = buildBookingEmailData({
        ...updatedBooking,
        additionalGuests: updatedBooking.additionalGuests,
      });
      sendBookingCancellation(emailData).catch(() => {});
    }

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}
