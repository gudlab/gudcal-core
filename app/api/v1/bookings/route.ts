import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/bookings — List bookings for authenticated user
export async function GET(req: Request) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "upcoming";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const now = new Date();
  let where: Record<string, unknown> = { userId: user!.id };

  switch (filter) {
    case "upcoming":
      where = {
        ...where,
        startTime: { gte: now },
        status: { in: ["CONFIRMED", "PENDING"] },
      };
      break;
    case "past":
      where = { ...where, endTime: { lt: now } };
      break;
    case "cancelled":
      where = { ...where, status: "CANCELLED" };
      break;
    case "pending":
      where = { ...where, status: "PENDING" };
      break;
    case "all":
      // No additional filters
      break;
    default:
      where = {
        ...where,
        startTime: { gte: now },
        status: { in: ["CONFIRMED", "PENDING"] },
      };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { startTime: filter === "past" ? "desc" : "asc" },
      take: limit,
      skip: offset,
      include: {
        eventType: { select: { title: true, slug: true, duration: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      uid: b.uid,
      eventType: b.eventType.title,
      eventSlug: b.eventType.slug,
      duration: b.eventType.duration,
      guestName: b.guestName,
      guestEmail: b.guestEmail,
      guestTimezone: b.guestTimezone,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      location: b.location,
      notes: b.notes,
      cancelReason: b.cancelReason,
      metadata: b.metadata,
      createdAt: b.createdAt,
    })),
    total,
    limit,
    offset,
  });
}
