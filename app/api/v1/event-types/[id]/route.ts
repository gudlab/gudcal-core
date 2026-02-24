import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/event-types/:id — Get a single event type
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const { id } = await params;

  const eventType = await prisma.eventType.findFirst({
    where: { id, userId: user!.id },
    include: {
      availability: { select: { id: true, name: true } },
      _count: { select: { bookings: true } },
    },
  });

  if (!eventType) {
    return NextResponse.json(
      { error: "Event type not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ...eventType,
    bookingCount: eventType._count.bookings,
    _count: undefined,
  });
}

// PUT /api/v1/event-types/:id — Update an event type
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.eventType.findFirst({
      where: { id, userId: user!.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Event type not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    const fields = [
      "title", "slug", "description", "duration", "locationType",
      "locationValue", "color", "isActive", "requiresConfirmation",
      "bufferBefore", "bufferAfter", "maxBookingsPerDay", "minimumNotice",
      "slotInterval", "schedulingType", "price", "currency", "availabilityId",
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    if (body.customQuestions !== undefined) {
      data.customQuestions = JSON.parse(JSON.stringify(body.customQuestions));
    }

    // Check slug uniqueness if changing
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await prisma.eventType.findUnique({
        where: { userId_slug: { userId: user!.id, slug: body.slug } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "An event type with this slug already exists" },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.eventType.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/v1/event-types/:id — Delete an event type
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.eventType.findFirst({
    where: { id, userId: user!.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Event type not found" },
      { status: 404 },
    );
  }

  await prisma.eventType.delete({ where: { id } });

  return NextResponse.json({ message: "Event type deleted" });
}
