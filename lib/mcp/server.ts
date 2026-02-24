import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability";
import { addDays, addMinutes, startOfDay, endOfDay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { randomBytes } from "crypto";

// ─── Helper: validate API key and return user ──────────────
async function authenticateKey(apiKey: string) {
  const key = await prisma.apiKey.findUnique({
    where: { key: apiKey },
    include: { user: true },
  });

  if (!key || (key.expiresAt && key.expiresAt < new Date())) {
    return { error: "Invalid or expired API key.", user: null, keyId: null };
  }

  // Update last used (non-blocking)
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsed: new Date() } })
    .catch(() => {});

  return { error: null, user: key.user, keyId: key.id };
}

function errorResponse(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function jsonResponse(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function createMcpServer() {
  const server = new McpServer({
    name: "GudCal",
    version: "2.0.0",
  });

  // ═══════════════════════════════════════════════════════════
  // PUBLIC TOOLS — No authentication required
  // ═══════════════════════════════════════════════════════════

  // Tool: List event types for a user (public)
  server.tool(
    "list_event_types",
    "List available event types for a user. Returns active event types that can be booked. No authentication required.",
    {
      username: z
        .string()
        .describe("The username of the person you want to book with"),
    },
    async ({ username }) => {
      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });

      if (!user) {
        return errorResponse(`User "${username}" not found.`);
      }

      const eventTypes = await prisma.eventType.findMany({
        where: { userId: user.id, isActive: true },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          duration: true,
          locationType: true,
        },
      });

      return jsonResponse(eventTypes);
    },
  );

  // Tool: Get available time slots (public)
  server.tool(
    "get_availability",
    "Get available time slots for booking a specific event type with a user. No authentication required.",
    {
      username: z.string().describe("The username of the host"),
      eventSlug: z.string().describe("The slug of the event type"),
      dateFrom: z
        .string()
        .optional()
        .describe("Start date in YYYY-MM-DD format (defaults to today)"),
      dateTo: z
        .string()
        .optional()
        .describe(
          "End date in YYYY-MM-DD format (defaults to 7 days from start)",
        ),
      timezone: z
        .string()
        .optional()
        .describe("Guest timezone (defaults to UTC)"),
    },
    async ({ username, eventSlug, dateFrom, dateTo, timezone }) => {
      const guestTimezone = timezone ?? "UTC";

      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true, timezone: true },
      });

      if (!user) {
        return errorResponse(`User "${username}" not found.`);
      }

      const eventType = await prisma.eventType.findFirst({
        where: { userId: user.id, slug: eventSlug, isActive: true },
        include: {
          availability: {
            include: { rules: true, dateOverrides: true },
          },
        },
      });

      if (!eventType) {
        return errorResponse(
          `Event type "${eventSlug}" not found or inactive.`,
        );
      }

      let availability = eventType.availability;
      if (!availability) {
        availability = await prisma.availability.findFirst({
          where: { userId: user.id, isDefault: true },
          include: { rules: true, dateOverrides: true },
        });
      }

      if (!availability) {
        return errorResponse("No availability configured for this user.");
      }

      const now = new Date();
      const startDate = dateFrom
        ? startOfDay(
            fromZonedTime(
              new Date(dateFrom + "T00:00:00"),
              availability.timezone,
            ),
          )
        : startOfDay(now);
      const endDate = dateTo
        ? endOfDay(
            fromZonedTime(
              new Date(dateTo + "T23:59:59"),
              availability.timezone,
            ),
          )
        : endOfDay(addDays(now, 6));

      const existingBookings = await prisma.booking.findMany({
        where: {
          userId: user.id,
          startTime: { gte: startDate },
          endTime: { lte: endDate },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
        select: { startTime: true, endTime: true },
      });

      const slots = getAvailableSlots({
        startDate,
        endDate,
        duration: eventType.duration,
        slotInterval: eventType.slotInterval ?? undefined,
        bufferBefore: eventType.bufferBefore,
        bufferAfter: eventType.bufferAfter,
        minimumNotice: eventType.minimumNotice,
        maxBookingsPerDay: eventType.maxBookingsPerDay,
        rules: availability.rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
        dateOverrides: availability.dateOverrides.map((o) => ({
          date: o.date.toISOString().split("T")[0],
          startTime: o.startTime,
          endTime: o.endTime,
          isBlocked: o.isBlocked,
        })),
        hostTimezone: availability.timezone,
        busyTimes: [],
        existingBookings: existingBookings.map((b) => ({
          start: b.startTime,
          end: b.endTime,
        })),
        guestTimezone,
      });

      const formatted = slots
        .filter((day) => day.slots.length > 0)
        .map((day) => ({
          date: day.date,
          slots: day.slots.map((s) => ({
            start: s.start.toISOString(),
            end: s.end.toISOString(),
          })),
        }));

      return jsonResponse(formatted);
    },
  );

  // Tool: Create a booking (public)
  server.tool(
    "create_booking",
    "Book a time slot with a user. Requires guest information and a specific start time. No authentication required.",
    {
      username: z
        .string()
        .min(1)
        .max(100)
        .describe("The username of the host"),
      eventSlug: z
        .string()
        .min(1)
        .max(200)
        .describe("The slug of the event type"),
      startTime: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), "Must be a valid ISO 8601 date")
        .describe("Start time in ISO 8601 format (UTC)"),
      guestName: z
        .string()
        .min(1)
        .max(200)
        .describe("Full name of the person booking"),
      guestEmail: z
        .string()
        .email()
        .max(320)
        .describe("Email of the person booking"),
      guestTimezone: z
        .string()
        .max(100)
        .optional()
        .describe("Timezone of the guest (defaults to UTC)"),
      notes: z
        .string()
        .max(2000)
        .optional()
        .describe("Optional notes for the meeting"),
    },
    async ({
      username,
      eventSlug,
      startTime: startTimeStr,
      guestName,
      guestEmail,
      guestTimezone,
      notes,
    }) => {
      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });

      if (!user) {
        return errorResponse(`User "${username}" not found.`);
      }

      const eventType = await prisma.eventType.findFirst({
        where: { userId: user.id, slug: eventSlug, isActive: true },
      });

      if (!eventType) {
        return errorResponse(
          `Event type "${eventSlug}" not found or inactive.`,
        );
      }

      const startTime = new Date(startTimeStr);

      if (startTime < new Date()) {
        return errorResponse("Cannot book a time in the past.");
      }

      const endTime = addMinutes(startTime, eventType.duration);

      const booking = await prisma.$transaction(async (tx) => {
        const conflicts = await tx.booking.findMany({
          where: {
            userId: user.id,
            startTime: { lt: endTime },
            endTime: { gt: startTime },
            status: { in: ["CONFIRMED", "PENDING"] },
          },
        });

        if (conflicts.length > 0) {
          return null;
        }

        return tx.booking.create({
          data: {
            eventTypeId: eventType.id,
            userId: user.id,
            guestName,
            guestEmail,
            guestTimezone: guestTimezone ?? "UTC",
            startTime,
            endTime,
            status: eventType.requiresConfirmation ? "PENDING" : "CONFIRMED",
            notes: notes ?? null,
          },
        });
      });

      if (!booking) {
        return errorResponse(
          "This time slot is no longer available. Please check availability and try another time.",
        );
      }

      return jsonResponse({
        bookingId: booking.uid,
        status: booking.status,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.uid}`,
      });
    },
  );

  // Tool: Cancel a booking (public — requires guest email verification)
  server.tool(
    "cancel_booking",
    "Cancel an existing booking by its booking ID (uid). Requires the guest email for verification. No authentication required.",
    {
      bookingUid: z.string().describe("The booking UID"),
      guestEmail: z
        .string()
        .email()
        .describe("Email of the guest who made the booking (for verification)"),
      reason: z
        .string()
        .max(1000)
        .optional()
        .describe("Reason for cancellation"),
    },
    async ({ bookingUid, guestEmail, reason }) => {
      const booking = await prisma.booking.findUnique({
        where: { uid: bookingUid },
      });

      if (!booking) {
        return errorResponse(`Booking "${bookingUid}" not found.`);
      }

      if (booking.guestEmail.toLowerCase() !== guestEmail.toLowerCase()) {
        return errorResponse(`Booking "${bookingUid}" not found.`);
      }

      if (booking.status === "CANCELLED") {
        return errorResponse("This booking is already cancelled.");
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelReason: reason ?? null,
        },
      });

      return errorResponse(`Booking ${bookingUid} has been cancelled.`);
    },
  );

  // ═══════════════════════════════════════════════════════════
  // AUTHENTICATED TOOLS — Require API key
  // ═══════════════════════════════════════════════════════════

  // ─── Profile Management ──────────────────────────────────

  server.tool(
    "get_profile",
    "Get the authenticated user's profile information. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
    },
    async ({ apiKey }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      return jsonResponse({
        id: user!.id,
        name: user!.name,
        email: user!.email,
        username: user!.username,
        timezone: user!.timezone,
        bio: user!.bio,
        weekStart: user!.weekStart,
      });
    },
  );

  server.tool(
    "update_profile",
    "Update the authenticated user's profile. Requires API key. All fields are optional — only provided fields are updated.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      name: z.string().max(100).optional().describe("Display name"),
      username: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional()
        .describe("Username (letters, numbers, hyphens, underscores)"),
      timezone: z
        .string()
        .max(100)
        .optional()
        .describe("IANA timezone (e.g. America/New_York)"),
      bio: z.string().max(500).optional().describe("Short bio"),
      weekStart: z
        .number()
        .min(0)
        .max(6)
        .optional()
        .describe("Week start day (0=Sunday, 1=Monday, …6=Saturday)"),
    },
    async ({ apiKey, name, username, timezone, bio, weekStart }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      // Check username uniqueness
      if (username && username !== user!.username) {
        const existing = await prisma.user.findUnique({
          where: { username },
        });
        if (existing) {
          return errorResponse(`Username "${username}" is already taken.`);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (username !== undefined) data.username = username;
      if (timezone !== undefined) data.timezone = timezone;
      if (bio !== undefined) data.bio = bio;
      if (weekStart !== undefined) data.weekStart = weekStart;

      const updated = await prisma.user.update({
        where: { id: user!.id },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          timezone: true,
          bio: true,
          weekStart: true,
        },
      });

      return jsonResponse(updated);
    },
  );

  // ─── Event Type Management ───────────────────────────────

  server.tool(
    "get_my_event_types",
    "List all event types owned by the authenticated user (including inactive ones). Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
    },
    async ({ apiKey }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const eventTypes = await prisma.eventType.findMany({
        where: { userId: user!.id },
        include: {
          availability: { select: { id: true, name: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return jsonResponse(
        eventTypes.map((et) => ({
          id: et.id,
          title: et.title,
          slug: et.slug,
          description: et.description,
          duration: et.duration,
          locationType: et.locationType,
          isActive: et.isActive,
          requiresConfirmation: et.requiresConfirmation,
          bufferBefore: et.bufferBefore,
          bufferAfter: et.bufferAfter,
          minimumNotice: et.minimumNotice,
          maxBookingsPerDay: et.maxBookingsPerDay,
          slotInterval: et.slotInterval,
          price: et.price,
          currency: et.currency,
          color: et.color,
          availability: et.availability,
          bookingCount: et._count.bookings,
        })),
      );
    },
  );

  server.tool(
    "create_event_type",
    "Create a new event type for the authenticated user. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      title: z
        .string()
        .min(1)
        .max(200)
        .describe("Event type title (e.g. '30-Minute Call')"),
      slug: z
        .string()
        .min(1)
        .max(200)
        .regex(/^[a-z0-9-]+$/)
        .describe("URL slug (lowercase, hyphens, e.g. '30-min-call')"),
      description: z
        .string()
        .max(2000)
        .optional()
        .describe("Description of this event type"),
      duration: z
        .number()
        .min(5)
        .max(480)
        .optional()
        .describe("Duration in minutes (default: 30)"),
      locationType: z
        .enum(["IN_PERSON", "GOOGLE_MEET", "ZOOM", "PHONE", "CUSTOM"])
        .optional()
        .describe("Location type (default: GOOGLE_MEET)"),
      locationValue: z
        .string()
        .max(500)
        .optional()
        .describe("Location details (address, phone number, or URL)"),
      isActive: z
        .boolean()
        .optional()
        .describe("Whether this event type is active (default: true)"),
      requiresConfirmation: z
        .boolean()
        .optional()
        .describe("Whether bookings need manual confirmation (default: false)"),
      bufferBefore: z
        .number()
        .min(0)
        .max(120)
        .optional()
        .describe("Buffer time before event in minutes (default: 0)"),
      bufferAfter: z
        .number()
        .min(0)
        .max(120)
        .optional()
        .describe("Buffer time after event in minutes (default: 0)"),
      minimumNotice: z
        .number()
        .min(0)
        .optional()
        .describe("Minimum advance notice in minutes (default: 120)"),
      maxBookingsPerDay: z
        .number()
        .min(1)
        .optional()
        .describe("Maximum bookings per day (null = unlimited)"),
      slotInterval: z
        .number()
        .min(5)
        .optional()
        .describe("Custom slot interval in minutes (null = use duration)"),
      color: z
        .string()
        .max(7)
        .optional()
        .describe("Hex color code (default: #0069FF)"),
      availabilityId: z
        .string()
        .optional()
        .describe("ID of an availability schedule to link"),
    },
    async ({ apiKey, slug, availabilityId, ...rest }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      // Check slug uniqueness for this user
      const existing = await prisma.eventType.findFirst({
        where: { userId: user!.id, slug },
      });
      if (existing) {
        return errorResponse(
          `You already have an event type with slug "${slug}".`,
        );
      }

      // Verify availability belongs to user
      if (availabilityId) {
        const avail = await prisma.availability.findFirst({
          where: { id: availabilityId, userId: user!.id },
        });
        if (!avail) {
          return errorResponse("Availability schedule not found.");
        }
      }

      const eventType = await prisma.eventType.create({
        data: {
          userId: user!.id,
          slug,
          availabilityId: availabilityId ?? null,
          ...rest,
        },
      });

      return jsonResponse({
        id: eventType.id,
        title: eventType.title,
        slug: eventType.slug,
        duration: eventType.duration,
        isActive: eventType.isActive,
        bookingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${user!.username}/${eventType.slug}`,
      });
    },
  );

  server.tool(
    "update_event_type",
    "Update an existing event type. Requires API key. All fields except eventTypeId are optional.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      eventTypeId: z.string().describe("The event type ID to update"),
      title: z.string().min(1).max(200).optional().describe("Event type title"),
      slug: z
        .string()
        .min(1)
        .max(200)
        .regex(/^[a-z0-9-]+$/)
        .optional()
        .describe("URL slug"),
      description: z
        .string()
        .max(2000)
        .optional()
        .describe("Description"),
      duration: z
        .number()
        .min(5)
        .max(480)
        .optional()
        .describe("Duration in minutes"),
      locationType: z
        .enum(["IN_PERSON", "GOOGLE_MEET", "ZOOM", "PHONE", "CUSTOM"])
        .optional()
        .describe("Location type"),
      locationValue: z
        .string()
        .max(500)
        .optional()
        .describe("Location details"),
      isActive: z
        .boolean()
        .optional()
        .describe("Whether active"),
      requiresConfirmation: z
        .boolean()
        .optional()
        .describe("Whether bookings need confirmation"),
      bufferBefore: z
        .number()
        .min(0)
        .max(120)
        .optional()
        .describe("Buffer before in minutes"),
      bufferAfter: z
        .number()
        .min(0)
        .max(120)
        .optional()
        .describe("Buffer after in minutes"),
      minimumNotice: z
        .number()
        .min(0)
        .optional()
        .describe("Minimum advance notice in minutes"),
      maxBookingsPerDay: z
        .number()
        .min(1)
        .optional()
        .describe("Maximum bookings per day"),
      slotInterval: z
        .number()
        .min(5)
        .optional()
        .describe("Slot interval in minutes"),
      color: z.string().max(7).optional().describe("Hex color code"),
      availabilityId: z
        .string()
        .optional()
        .describe("Availability schedule ID"),
    },
    async ({ apiKey, eventTypeId, slug, ...rest }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const existing = await prisma.eventType.findFirst({
        where: { id: eventTypeId, userId: user!.id },
      });
      if (!existing) {
        return errorResponse("Event type not found.");
      }

      // Check slug uniqueness if changing
      if (slug && slug !== existing.slug) {
        const slugTaken = await prisma.eventType.findFirst({
          where: { userId: user!.id, slug, id: { not: eventTypeId } },
        });
        if (slugTaken) {
          return errorResponse(
            `You already have an event type with slug "${slug}".`,
          );
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = { ...rest };
      if (slug !== undefined) data.slug = slug;

      const updated = await prisma.eventType.update({
        where: { id: eventTypeId },
        data,
      });

      return jsonResponse({
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        duration: updated.duration,
        isActive: updated.isActive,
        bookingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${user!.username}/${updated.slug}`,
      });
    },
  );

  server.tool(
    "delete_event_type",
    "Delete an event type. This will also delete all associated bookings. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      eventTypeId: z.string().describe("The event type ID to delete"),
    },
    async ({ apiKey, eventTypeId }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const existing = await prisma.eventType.findFirst({
        where: { id: eventTypeId, userId: user!.id },
      });
      if (!existing) {
        return errorResponse("Event type not found.");
      }

      await prisma.eventType.delete({ where: { id: eventTypeId } });

      return errorResponse(
        `Event type "${existing.title}" (${existing.slug}) has been deleted.`,
      );
    },
  );

  // ─── Availability Management ─────────────────────────────

  server.tool(
    "list_availability_schedules",
    "List all availability schedules for the authenticated user, including rules and date overrides. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
    },
    async ({ apiKey }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const schedules = await prisma.availability.findMany({
        where: { userId: user!.id },
        include: {
          rules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
          dateOverrides: { orderBy: { date: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });

      return jsonResponse(
        schedules.map((s) => ({
          id: s.id,
          name: s.name,
          timezone: s.timezone,
          isDefault: s.isDefault,
          rules: s.rules.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
          })),
          dateOverrides: s.dateOverrides.map((o) => ({
            date: o.date.toISOString().split("T")[0],
            startTime: o.startTime,
            endTime: o.endTime,
            isBlocked: o.isBlocked,
          })),
        })),
      );
    },
  );

  server.tool(
    "create_availability",
    "Create a new availability schedule with weekly rules. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      name: z
        .string()
        .max(100)
        .optional()
        .describe("Schedule name (default: 'Working Hours')"),
      timezone: z
        .string()
        .max(100)
        .optional()
        .describe("IANA timezone (default: user's timezone)"),
      isDefault: z
        .boolean()
        .optional()
        .describe("Set as default schedule (default: false)"),
      rules: z
        .array(
          z.object({
            dayOfWeek: z
              .number()
              .min(0)
              .max(6)
              .describe("Day of week (0=Sunday … 6=Saturday)"),
            startTime: z
              .string()
              .describe("Start time in HH:mm format (e.g. '09:00')"),
            endTime: z
              .string()
              .describe("End time in HH:mm format (e.g. '17:00')"),
          }),
        )
        .describe("Weekly availability rules"),
    },
    async ({ apiKey, name, timezone, isDefault, rules }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      // If setting as default, unset existing defaults
      if (isDefault) {
        await prisma.availability.updateMany({
          where: { userId: user!.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      const schedule = await prisma.availability.create({
        data: {
          userId: user!.id,
          name: name ?? "Working Hours",
          timezone: timezone ?? user!.timezone,
          isDefault: isDefault ?? false,
          rules: {
            create: rules.map((r) => ({
              dayOfWeek: r.dayOfWeek,
              startTime: r.startTime,
              endTime: r.endTime,
            })),
          },
        },
        include: {
          rules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        },
      });

      return jsonResponse({
        id: schedule.id,
        name: schedule.name,
        timezone: schedule.timezone,
        isDefault: schedule.isDefault,
        rules: schedule.rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      });
    },
  );

  server.tool(
    "update_availability",
    "Update an availability schedule. If rules are provided, existing rules are replaced. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      availabilityId: z.string().describe("The availability schedule ID"),
      name: z.string().max(100).optional().describe("Schedule name"),
      timezone: z.string().max(100).optional().describe("IANA timezone"),
      isDefault: z.boolean().optional().describe("Set as default schedule"),
      rules: z
        .array(
          z.object({
            dayOfWeek: z.number().min(0).max(6),
            startTime: z.string(),
            endTime: z.string(),
          }),
        )
        .optional()
        .describe("Replacement weekly rules (replaces all existing rules)"),
    },
    async ({ apiKey, availabilityId, name, timezone, isDefault, rules }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const existing = await prisma.availability.findFirst({
        where: { id: availabilityId, userId: user!.id },
      });
      if (!existing) {
        return errorResponse("Availability schedule not found.");
      }

      if (isDefault) {
        await prisma.availability.updateMany({
          where: { userId: user!.id, isDefault: true, id: { not: availabilityId } },
          data: { isDefault: false },
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (timezone !== undefined) data.timezone = timezone;
      if (isDefault !== undefined) data.isDefault = isDefault;

      // Replace rules if provided
      if (rules) {
        await prisma.availabilityRule.deleteMany({
          where: { availabilityId },
        });
        data.rules = {
          create: rules.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
          })),
        };
      }

      const updated = await prisma.availability.update({
        where: { id: availabilityId },
        data,
        include: {
          rules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        },
      });

      return jsonResponse({
        id: updated.id,
        name: updated.name,
        timezone: updated.timezone,
        isDefault: updated.isDefault,
        rules: updated.rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      });
    },
  );

  server.tool(
    "delete_availability",
    "Delete an availability schedule. Cannot delete the default schedule if it's the only one. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      availabilityId: z.string().describe("The availability schedule ID"),
    },
    async ({ apiKey, availabilityId }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const existing = await prisma.availability.findFirst({
        where: { id: availabilityId, userId: user!.id },
      });
      if (!existing) {
        return errorResponse("Availability schedule not found.");
      }

      // Prevent deleting the only schedule
      const count = await prisma.availability.count({
        where: { userId: user!.id },
      });
      if (count <= 1) {
        return errorResponse(
          "Cannot delete your only availability schedule. Create a new one first.",
        );
      }

      await prisma.availability.delete({ where: { id: availabilityId } });

      return errorResponse(
        `Availability schedule "${existing.name}" has been deleted.`,
      );
    },
  );

  // ─── Booking Management (Authenticated) ──────────────────

  server.tool(
    "get_bookings",
    "Get bookings for the authenticated user. Supports filtering and pagination. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      filter: z
        .enum(["upcoming", "past", "cancelled", "pending", "all"])
        .optional()
        .describe("Filter bookings (default: upcoming)"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Max results to return (default: 20)"),
      offset: z
        .number()
        .min(0)
        .optional()
        .describe("Number of results to skip for pagination (default: 0)"),
    },
    async ({ apiKey, filter, limit, offset }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const now = new Date();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { userId: user!.id };

      switch (filter ?? "upcoming") {
        case "upcoming":
          where.startTime = { gte: now };
          where.status = { in: ["CONFIRMED", "PENDING"] };
          break;
        case "past":
          where.endTime = { lt: now };
          break;
        case "cancelled":
          where.status = "CANCELLED";
          break;
        case "pending":
          where.status = "PENDING";
          break;
        case "all":
          break;
      }

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          eventType: { select: { title: true, duration: true, slug: true } },
        },
        orderBy: {
          startTime: filter === "past" ? "desc" : "asc",
        },
        take: limit ?? 20,
        skip: offset ?? 0,
      });

      return jsonResponse(
        bookings.map((b) => ({
          uid: b.uid,
          eventType: b.eventType.title,
          eventSlug: b.eventType.slug,
          guestName: b.guestName,
          guestEmail: b.guestEmail,
          guestTimezone: b.guestTimezone,
          startTime: b.startTime.toISOString(),
          endTime: b.endTime.toISOString(),
          status: b.status,
          notes: b.notes,
          cancelReason: b.cancelReason,
        })),
      );
    },
  );

  server.tool(
    "confirm_booking",
    "Confirm a pending booking. Only works on bookings with PENDING status. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      bookingUid: z.string().describe("The booking UID to confirm"),
    },
    async ({ apiKey, bookingUid }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const booking = await prisma.booking.findFirst({
        where: { uid: bookingUid, userId: user!.id },
      });

      if (!booking) {
        return errorResponse("Booking not found.");
      }

      if (booking.status !== "PENDING") {
        return errorResponse(
          `Cannot confirm a booking with status "${booking.status}". Only PENDING bookings can be confirmed.`,
        );
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED" },
      });

      return errorResponse(`Booking ${bookingUid} has been confirmed.`);
    },
  );

  server.tool(
    "cancel_booking_as_host",
    "Cancel a booking as the host. Works on CONFIRMED or PENDING bookings. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      bookingUid: z.string().describe("The booking UID to cancel"),
      reason: z
        .string()
        .max(1000)
        .optional()
        .describe("Reason for cancellation"),
    },
    async ({ apiKey, bookingUid, reason }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const booking = await prisma.booking.findFirst({
        where: { uid: bookingUid, userId: user!.id },
      });

      if (!booking) {
        return errorResponse("Booking not found.");
      }

      if (booking.status === "CANCELLED") {
        return errorResponse("This booking is already cancelled.");
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelReason: reason ?? null,
        },
      });

      return errorResponse(`Booking ${bookingUid} has been cancelled.`);
    },
  );

  server.tool(
    "mark_no_show",
    "Mark a booking as no-show. Only works on past CONFIRMED bookings. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      bookingUid: z.string().describe("The booking UID to mark as no-show"),
    },
    async ({ apiKey, bookingUid }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const booking = await prisma.booking.findFirst({
        where: { uid: bookingUid, userId: user!.id },
      });

      if (!booking) {
        return errorResponse("Booking not found.");
      }

      if (booking.status !== "CONFIRMED") {
        return errorResponse(
          `Cannot mark a "${booking.status}" booking as no-show.`,
        );
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "NO_SHOW" },
      });

      return errorResponse(`Booking ${bookingUid} has been marked as no-show.`);
    },
  );

  // ─── API Key Management ──────────────────────────────────

  server.tool(
    "list_api_keys",
    "List all API keys for the authenticated user. Keys are masked for security. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
    },
    async ({ apiKey }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const keys = await prisma.apiKey.findMany({
        where: { userId: user!.id },
        orderBy: { createdAt: "desc" },
      });

      return jsonResponse(
        keys.map((k) => ({
          id: k.id,
          name: k.name,
          key: k.key.slice(0, 8) + "..." + k.key.slice(-4),
          expiresAt: k.expiresAt?.toISOString() ?? null,
          lastUsed: k.lastUsed?.toISOString() ?? null,
          createdAt: k.createdAt.toISOString(),
        })),
      );
    },
  );

  server.tool(
    "create_api_key",
    "Create a new API key for the authenticated user. The full key is returned only once — store it securely. Requires API key.",
    {
      apiKey: z.string().describe("Your current GudCal API key"),
      name: z
        .string()
        .min(1)
        .max(100)
        .describe("A descriptive name for this key (e.g. 'My Agent')"),
      expiresInDays: z
        .number()
        .min(1)
        .max(365)
        .optional()
        .describe("Key expiration in days (null = never expires)"),
    },
    async ({ apiKey, name, expiresInDays }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const newKey = "gck_" + randomBytes(32).toString("hex");

      const created = await prisma.apiKey.create({
        data: {
          userId: user!.id,
          name,
          key: newKey,
          expiresAt: expiresInDays
            ? new Date(Date.now() + expiresInDays * 86400000)
            : null,
        },
      });

      return jsonResponse({
        id: created.id,
        name: created.name,
        key: newKey,
        expiresAt: created.expiresAt?.toISOString() ?? null,
        warning:
          "Store this key securely. It will not be shown again.",
      });
    },
  );

  server.tool(
    "revoke_api_key",
    "Revoke (delete) an API key. Requires API key.",
    {
      apiKey: z.string().describe("Your GudCal API key"),
      keyId: z.string().describe("The ID of the API key to revoke"),
    },
    async ({ apiKey, keyId }) => {
      const { error, user } = await authenticateKey(apiKey);
      if (error) return errorResponse(error);

      const existing = await prisma.apiKey.findFirst({
        where: { id: keyId, userId: user!.id },
      });
      if (!existing) {
        return errorResponse("API key not found.");
      }

      await prisma.apiKey.delete({ where: { id: keyId } });

      return errorResponse(`API key "${existing.name}" has been revoked.`);
    },
  );

  return server;
}
