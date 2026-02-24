import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/me — Get authenticated user profile
export async function GET(req: Request) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  return NextResponse.json({
    id: user!.id,
    name: user!.name,
    email: user!.email,
    username: user!.username,
    timezone: user!.timezone,
    bio: user!.bio,
    weekStart: user!.weekStart,
    image: user!.image,
    createdAt: user!.createdAt,
  });
}

// PUT /api/v1/me — Update authenticated user profile
export async function PUT(req: Request) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, username, timezone, bio, weekStart } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (username !== undefined) {
      // Check username uniqueness
      if (username) {
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing && existing.id !== user!.id) {
          return NextResponse.json(
            { error: "Username is already taken" },
            { status: 409 },
          );
        }
      }
      data.username = username;
    }
    if (timezone !== undefined) data.timezone = timezone;
    if (bio !== undefined) data.bio = bio;
    if (weekStart !== undefined) data.weekStart = weekStart;

    const updated = await prisma.user.update({
      where: { id: user!.id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      username: updated.username,
      timezone: updated.timezone,
      bio: updated.bio,
      weekStart: updated.weekStart,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
