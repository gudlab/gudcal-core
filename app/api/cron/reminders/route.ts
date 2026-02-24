import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { prisma } from "@/lib/db";
import { sendBookingReminder } from "@/lib/emails";

function verifySecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!provided || !expected) return false;
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  // Verify cron secret via Authorization header
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : new URL(request.url).searchParams.get("secret");

  if (!verifySecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // 25 hours

    // Find bookings starting in ~24 hours that haven't been reminded
    const bookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: windowStart, lte: windowEnd },
        status: "CONFIRMED",
        reminderSentAt: null,
      },
      include: {
        eventType: {
          select: { title: true, duration: true, locationType: true, locationValue: true },
        },
        host: { select: { name: true, email: true } },
      },
    });

    let sentCount = 0;

    for (const booking of bookings) {
      if (!booking.host.email) continue;

      const guestStart = toZonedTime(booking.startTime, booking.guestTimezone);
      const guestEnd = toZonedTime(booking.endTime, booking.guestTimezone);

      // Parse additional guest emails from JSON field
      const additionalGuestEmails: string[] = [];
      if (booking.additionalGuests && Array.isArray(booking.additionalGuests)) {
        for (const g of booking.additionalGuests) {
          if (typeof g === "object" && g !== null && "email" in g && typeof (g as any).email === "string") {
            additionalGuestEmails.push((g as any).email);
          }
        }
      }

      await sendBookingReminder({
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        hostName: booking.host.name ?? "Host",
        hostEmail: booking.host.email,
        eventTitle: booking.eventType.title,
        dateStr: format(guestStart, "EEEE, MMMM d, yyyy"),
        timeStr: `${format(guestStart, "h:mm a")} - ${format(guestEnd, "h:mm a")}`,
        location: booking.location ?? booking.eventType.locationValue ?? undefined,
        bookingUid: booking.uid,
        notes: booking.notes ?? undefined,
        ...(additionalGuestEmails.length > 0 && { additionalGuestEmails }),
      });

      // Mark as reminded
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSentAt: now },
      });

      sentCount++;
    }

    return NextResponse.json({ sent: sentCount });
  } catch (error) {
    console.error("Reminder cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
