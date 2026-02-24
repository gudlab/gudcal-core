import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/event-types — List all event types for authenticated user
export async function GET(req: Request) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const eventTypes = await prisma.eventType.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: "desc" },
    include: {
      availability: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    eventTypes.map((et) => ({
      id: et.id,
      title: et.title,
      slug: et.slug,
      description: et.description,
      duration: et.duration,
      locationType: et.locationType,
      locationValue: et.locationValue,
      color: et.color,
      isActive: et.isActive,
      requiresConfirmation: et.requiresConfirmation,
      bufferBefore: et.bufferBefore,
      bufferAfter: et.bufferAfter,
      maxBookingsPerDay: et.maxBookingsPerDay,
      minimumNotice: et.minimumNotice,
      slotInterval: et.slotInterval,
      schedulingType: et.schedulingType,
      price: et.price,
      currency: et.currency,
      availabilityId: et.availabilityId,
      availabilityName: et.availability?.name,
      customQuestions: et.customQuestions,
      createdAt: et.createdAt,
      updatedAt: et.updatedAt,
    })),
  );
}

// POST /api/v1/event-types — Create a new event type
export async function POST(req: Request) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  try {
    const body = await req.json();
    const {
      title,
      slug,
      description,
      duration = 30,
      locationType = "GOOGLE_MEET",
      locationValue,
      color = "#10b981",
      isActive = true,
      requiresConfirmation = false,
      bufferBefore = 0,
      bufferAfter = 0,
      maxBookingsPerDay,
      minimumNotice = 120,
      slotInterval,
      schedulingType = "INDIVIDUAL",
      price,
      currency = "USD",
      availabilityId,
      customQuestions,
    } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: "title and slug are required" },
        { status: 400 },
      );
    }

    // Check for slug uniqueness per user
    const existing = await prisma.eventType.findUnique({
      where: { userId_slug: { userId: user!.id, slug } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An event type with this slug already exists" },
        { status: 409 },
      );
    }

    const eventType = await prisma.eventType.create({
      data: {
        userId: user!.id,
        title,
        slug,
        description,
        duration,
        locationType,
        locationValue,
        color,
        isActive,
        requiresConfirmation,
        bufferBefore,
        bufferAfter,
        maxBookingsPerDay,
        minimumNotice,
        slotInterval,
        schedulingType,
        price,
        currency,
        availabilityId,
        customQuestions: customQuestions
          ? JSON.parse(JSON.stringify(customQuestions))
          : undefined,
      },
    });

    return NextResponse.json(eventType, { status: 201 });
  } catch (err) {
    console.error("Create event type error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
