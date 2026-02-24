import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/availability — List all availability schedules
export async function GET(req: Request) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const schedules = await prisma.availability.findMany({
    where: { userId: user!.id },
    include: {
      rules: { orderBy: { dayOfWeek: "asc" } },
      dateOverrides: { orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(schedules);
}

// POST /api/v1/availability — Create a new availability schedule
export async function POST(req: Request) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  try {
    const body = await req.json();
    const {
      name = "Working Hours",
      isDefault = false,
      timezone,
      rules = [],
    } = body;

    // If setting as default, unset any existing default
    if (isDefault) {
      await prisma.availability.updateMany({
        where: { userId: user!.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const availability = await prisma.availability.create({
      data: {
        userId: user!.id,
        name,
        isDefault,
        timezone: timezone || user!.timezone,
        rules: {
          create: rules.map(
            (rule: {
              dayOfWeek: number;
              startTime: string;
              endTime: string;
            }) => ({
              dayOfWeek: rule.dayOfWeek,
              startTime: rule.startTime,
              endTime: rule.endTime,
            }),
          ),
        },
      },
      include: {
        rules: { orderBy: { dayOfWeek: "asc" } },
      },
    });

    return NextResponse.json(availability, { status: 201 });
  } catch (err) {
    console.error("Create availability error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
