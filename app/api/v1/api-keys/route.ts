import { NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/api-keys — List API keys (masked)
export async function GET(req: Request) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const keys = await prisma.apiKey.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.key.slice(0, 8) + "..." + k.key.slice(-4),
      expiresAt: k.expiresAt,
      lastUsed: k.lastUsed,
      createdAt: k.createdAt,
    })),
  );
}

// POST /api/v1/api-keys — Create a new API key
export async function POST(req: Request) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, expiresInDays } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    const key = `gck_${crypto.randomBytes(32).toString("hex")}`;
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user!.id,
        name,
        key,
        expiresAt,
      },
    });

    // Return the full key ONLY on creation (won't be shown again)
    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        note: "Save this key — it will not be shown again.",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
