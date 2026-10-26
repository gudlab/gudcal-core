-- Additive multi-calendar + TimeOff. Safe to apply on existing databases.
-- Do not reset or replace existing data.

ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "includeInBusyCheck" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "calendar_connections_userId_provider_idx" ON "calendar_connections"("userId", "provider");
CREATE INDEX IF NOT EXISTS "calendar_connections_userId_isPrimary_idx" ON "calendar_connections"("userId", "isPrimary");

DROP INDEX IF EXISTS "calendar_connections_userId_provider_key";

-- Collapse multiple primaries to one writable row (prefer GOOGLE, then id).
UPDATE "calendar_connections" AS c
SET "isPrimary" = false
WHERE c."provider" IN ('GOOGLE', 'OUTLOOK')
  AND c."isPrimary" = true
  AND EXISTS (
    SELECT 1
    FROM "calendar_connections" AS other
    WHERE other."userId" = c."userId"
      AND other."provider" IN ('GOOGLE', 'OUTLOOK')
      AND other."isPrimary" = true
      AND (
        other."provider" < c."provider"
        OR (other."provider" = c."provider" AND other."id" < c."id")
      )
  );

-- Users with writable calendars but no primary: pick the oldest GOOGLE/OUTLOOK row.
UPDATE "calendar_connections" AS c
SET "isPrimary" = true
WHERE c."id" IN (
  SELECT DISTINCT ON ("userId") "id"
  FROM "calendar_connections"
  WHERE "provider" IN ('GOOGLE', 'OUTLOOK')
  ORDER BY "userId", "created_at" ASC, "id" ASC
)
AND NOT EXISTS (
  SELECT 1
  FROM "calendar_connections" AS other
  WHERE other."userId" = c."userId"
    AND other."isPrimary" = true
    AND other."provider" IN ('GOOGLE', 'OUTLOOK')
);

DO $$ BEGIN
  CREATE TYPE "TimeOffLabel" AS ENUM ('HOLIDAY', 'SICK', 'AWAY', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "time_offs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL,
    "reason" TEXT,
    "label" "TimeOffLabel" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_offs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "time_offs_userId_startAt_idx" ON "time_offs"("userId", "startAt");

DO $$ BEGIN
  ALTER TABLE "time_offs"
    ADD CONSTRAINT "time_offs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
