import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

// DELETE /api/v1/api-keys/:id — Revoke an API key
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await authenticateApiKey(req);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: user!.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "API key not found" },
      { status: 404 },
    );
  }

  await prisma.apiKey.delete({ where: { id } });

  return NextResponse.json({ message: "API key revoked" });
}
