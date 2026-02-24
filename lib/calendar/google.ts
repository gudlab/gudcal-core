import { google } from "googleapis";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { prisma } from "@/lib/db";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
  );
}

// AES-256-GCM encryption
const ALGORITHM = "aes-256-gcm";
const KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, "hex")
  : randomBytes(32);

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function getGoogleAuthUrl(userId: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId,
  });
}

export async function handleGoogleCallback(
  code: string,
  userId: string
): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("No access token received");
  }

  // Get user's email from the token
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const calendarList = await calendar.calendarList.list();
  const primaryCalendar = calendarList.data.items?.find((c) => c.primary);
  const email = primaryCalendar?.id ?? undefined;

  await prisma.calendarConnection.upsert({
    where: {
      userId_provider: { userId, provider: "GOOGLE" },
    },
    update: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token
        ? encrypt(tokens.refresh_token)
        : undefined,
      expiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : undefined,
      email,
      calendarId: email,
      isPrimary: true,
    },
    create: {
      userId,
      provider: "GOOGLE",
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token
        ? encrypt(tokens.refresh_token)
        : null,
      expiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
      email,
      calendarId: email,
      isPrimary: true,
    },
  });
}

export async function getGoogleCalendarClient(userId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: {
      userId_provider: { userId, provider: "GOOGLE" },
    },
  });

  if (!connection) {
    throw new Error("No Google Calendar connection found");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: decrypt(connection.accessToken),
    refresh_token: connection.refreshToken
      ? decrypt(connection.refreshToken)
      : undefined,
    expiry_date: connection.expiresAt?.getTime(),
  });

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    const updateData: any = {};
    if (tokens.access_token) {
      updateData.accessToken = encrypt(tokens.access_token);
    }
    if (tokens.refresh_token) {
      updateData.refreshToken = encrypt(tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      updateData.expiresAt = new Date(tokens.expiry_date);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: updateData,
      });
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function getBusyTimes(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ start: Date; end: Date }[]> {
  try {
    const calendar = await getGoogleCalendarClient(userId);
    const connection = await prisma.calendarConnection.findUnique({
      where: { userId_provider: { userId, provider: "GOOGLE" } },
    });

    if (!connection?.calendarId) return [];

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: connection.calendarId }],
      },
    });

    const busy =
      response.data.calendars?.[connection.calendarId]?.busy ?? [];

    return busy
      .filter((b) => b.start && b.end)
      .map((b) => ({
        start: new Date(b.start!),
        end: new Date(b.end!),
      }));
  } catch (error) {
    console.error("Error fetching busy times:", error);
    return [];
  }
}

interface CalendarEventInput {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail: string;
  additionalAttendees?: { email: string }[];
  location?: string;
  createMeetLink?: boolean;
}

export interface CalendarEventResult {
  eventId: string;
  meetLink?: string;
}

export async function createCalendarEvent(
  userId: string,
  event: CalendarEventInput
): Promise<CalendarEventResult | null> {
  try {
    const calendar = await getGoogleCalendarClient(userId);

    const eventData: any = {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: "UTC",
      },
      attendees: [
        { email: event.attendeeEmail },
        ...(event.additionalAttendees ?? []),
      ],
    };

    if (event.location) {
      eventData.location = event.location;
    }

    if (event.createMeetLink) {
      eventData.conferenceData = {
        createRequest: {
          requestId: `gudcal-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: eventData,
      conferenceDataVersion: event.createMeetLink ? 1 : 0,
      sendUpdates: "all",
    });

    if (!response.data.id) return null;

    return {
      eventId: response.data.id,
      meetLink: response.data.hangoutLink ?? undefined,
    };
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return null;
  }
}

export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  event: Partial<CalendarEventInput>
): Promise<boolean> {
  try {
    const calendar = await getGoogleCalendarClient(userId);

    const updateData: any = {};
    if (event.summary) updateData.summary = event.summary;
    if (event.description) updateData.description = event.description;
    if (event.startTime) {
      updateData.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: "UTC",
      };
    }
    if (event.endTime) {
      updateData.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: "UTC",
      };
    }

    await calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: updateData,
      sendUpdates: "all",
    });

    return true;
  } catch (error) {
    console.error("Error updating calendar event:", error);
    return false;
  }
}

export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  try {
    const calendar = await getGoogleCalendarClient(userId);

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    });

    return true;
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    return false;
  }
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  await prisma.calendarConnection.deleteMany({
    where: { userId, provider: "GOOGLE" },
  });
}

/**
 * Helper: parse additionalGuests JSON into { email } array for calendar attendees.
 */
function parseAdditionalAttendees(
  additionalGuests: unknown,
): { email: string }[] {
  if (!additionalGuests || !Array.isArray(additionalGuests)) return [];
  return additionalGuests
    .filter(
      (g): g is { email: string } =>
        typeof g === "object" &&
        g !== null &&
        "email" in g &&
        typeof (g as any).email === "string",
    )
    .map((g) => ({ email: g.email }));
}

/**
 * Create a Google Calendar event for a booking and update the booking record
 * with the googleEventId (and Meet link if applicable).
 *
 * Returns { googleEventId, meetLink } if successful, or null if the host has
 * no Google Calendar connection or creation failed.
 */
export async function createCalendarEventForBooking(
  hostUserId: string,
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    guestName: string;
    guestEmail: string;
    location?: string | null;
    notes?: string | null;
    additionalGuests?: unknown;
  },
  eventType: {
    title: string;
    locationType: string;
  },
): Promise<{ googleEventId: string; meetLink?: string } | null> {
  try {
    const isGoogleMeet = eventType.locationType === "GOOGLE_MEET";

    const result = await createCalendarEvent(hostUserId, {
      summary: `${eventType.title} with ${booking.guestName}`,
      description: booking.notes ?? undefined,
      startTime: booking.startTime,
      endTime: booking.endTime,
      attendeeEmail: booking.guestEmail,
      additionalAttendees: parseAdditionalAttendees(booking.additionalGuests),
      location: booking.location ?? undefined,
      createMeetLink: isGoogleMeet,
    });

    if (!result) return null;

    // Update booking with googleEventId (and Meet link as location)
    const updateData: { googleEventId: string; location?: string } = {
      googleEventId: result.eventId,
    };

    if (isGoogleMeet && result.meetLink) {
      updateData.location = result.meetLink;
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: updateData,
    });

    return {
      googleEventId: result.eventId,
      meetLink: result.meetLink,
    };
  } catch (error) {
    console.error("Error creating calendar event for booking:", error);
    return null;
  }
}

/**
 * Delete the Google Calendar event associated with a booking (if any).
 */
export async function deleteCalendarEventForBooking(
  hostUserId: string,
  googleEventId: string | null,
): Promise<void> {
  if (!googleEventId) return;

  try {
    await deleteCalendarEvent(hostUserId, googleEventId);
  } catch (error) {
    console.error("Error deleting calendar event for booking:", error);
  }
}
