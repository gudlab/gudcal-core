import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/availability/:id — Get a single availability schedule
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const { id } = await params;

  const schedule = await prisma.availability.findFirst({
    where: { id, userId: user!.id },
    include: {
      rules: { orderBy: { dayOfWeek: "asc" } },
      dateOverrides: { orderBy: { date: "asc" } },
    },
  });

  if (!schedule) {
    return NextResponse.json(
      { error: "Availability schedule not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(schedule);
}

// PUT /api/v1/availability/:id — Update availability (replaces rules)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.availability.findFirst({
      where: { id, userId: user!.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Availability schedule not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { name, isDefault, timezone, rules, dateOverrides } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (timezone !== undefined) data.timezone = timezone;

    if (isDefault === true) {
      await prisma.availability.updateMany({
        where: { userId: user!.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
      data.isDefault = true;
    } else if (isDefault === false) {
      data.isDefault = false;
    }

    // Replace rules if provided
    if (rules !== undefined) {
      await prisma.availabilityRule.deleteMany({
        where: { availabilityId: id },
      });

      if (rules.length > 0) {
        await prisma.availabilityRule.createMany({
          data: rules.map(
            (rule: {
              dayOfWeek: number;
              startTime: string;
              endTime: string;
            }) => ({
              availabilityId: id,
              dayOfWeek: rule.dayOfWeek,
              startTime: rule.startTime,
              endTime: rule.endTime,
            }),
          ),
        });
      }
    }

    // Replace date overrides if provided
    if (dateOverrides !== undefined) {
      await prisma.dateOverride.deleteMany({
        where: { availabilityId: id },
      });

      if (dateOverrides.length > 0) {
        await prisma.dateOverride.createMany({
          data: dateOverrides.map(
            (ovr: {
              date: string;
              startTime?: string;
              endTime?: string;
              isBlocked?: boolean;
            }) => ({
              availabilityId: id,
              date: new Date(ovr.date),
              startTime: ovr.startTime || null,
              endTime: ovr.endTime || null,
              isBlocked: ovr.isBlocked || false,
            }),
          ),
        });
      }
    }

    const updated = await prisma.availability.update({
      where: { id },
      data,
      include: {
        rules: { orderBy: { dayOfWeek: "asc" } },
        dateOverrides: { orderBy: { date: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update availability error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/v1/availability/:id — Delete an availability schedule
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.availability.findFirst({
    where: { id, userId: user!.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Availability schedule not found" },
      { status: 404 },
    );
  }

  await prisma.availability.delete({ where: { id } });

  return NextResponse.json({ message: "Availability schedule deleted" });
}
