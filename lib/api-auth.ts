import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

/**
 * Authenticate an API request using a Bearer API key.
 * Returns the authenticated user or a NextResponse error.
 */
export async function authenticateApiKey(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Missing or invalid Authorization header. Use: Bearer <api-key>" },
        { status: 401 },
      ),
      user: null,
    };
  }

  const key = authHeader.slice(7).trim();

  if (!key) {
    return {
      error: NextResponse.json(
        { error: "API key is required" },
        { status: 401 },
      ),
      user: null,
    };
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: { user: true },
  });

  if (!apiKey) {
    return {
      error: NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 },
      ),
      user: null,
    };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return {
      error: NextResponse.json(
        { error: "API key has expired" },
        { status: 401 },
      ),
      user: null,
    };
  }

  // Update last used timestamp (non-blocking)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() },
  }).catch(() => {});

  return { error: null, user: apiKey.user };
}
