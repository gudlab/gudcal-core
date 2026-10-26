import { google } from "googleapis";
import type { CalendarConnection } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "./encryption";
import { CalendarBusyLookupError, queryGoogleBusyTimes } from "./busy";
import { mergeBusyIntervals } from "./connection-policy";
import {
  getPrimaryWriteConnection,
  listSameProviderConnectionsForEvent,
  saveCalendarConnection,
} from "./connections";
import { tryEventConnections } from "./connection-policy";

export { decrypt, encrypt } from "./encryption";
export { CalendarBusyLookupError } from "./busy";

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

export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    // select_account forces the account picker so a second Google login
    // is not silently reused. consent is required so we receive a refresh token.
    prompt: "select_account consent",
    state,
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
  const email = primaryCalendar?.id ?? null;

  await saveCalendarConnection({
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
  });
}

export async function getGoogleCalendarClientForConnection(
  connection: CalendarConnection,
) {
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
    const updateData: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
    } = {};
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

async function getGoogleConnectionForWrite(
  userId: string,
): Promise<CalendarConnection | null> {
  const primary = await getPrimaryWriteConnection(userId);
  if (primary?.provider === "GOOGLE") return primary;
  return null;
}

export async function listGoogleCalendars(
  connection: CalendarConnection,
): Promise<{ id: string; summary: string; primary: boolean }[]> {
  const calendar = await getGoogleCalendarClientForConnection(connection);
  const calendarList = await calendar.calendarList.list();
  return (calendarList.data.items ?? [])
    .filter((c): c is typeof c & { id: string } => Boolean(c.id))
    .map((c) => ({
      id: c.id,
      summary: c.summary ?? c.id,
      primary: Boolean(c.primary),
    }));
}

export async function getBusyTimes(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ start: Date; end: Date }[]> {
  const connections = await prisma.calendarConnection.findMany({
    where: { userId, provider: "GOOGLE", includeInBusyCheck: true },
  });

  if (connections.length === 0) return [];

  const batches = await Promise.all(
    connections.map((connection) =>
      queryGoogleBusyTimes(connection, async () => {
        const calendarId = connection.calendarId;
        if (!calendarId) {
          throw new CalendarBusyLookupError(
            "Google Calendar is connected but has no calendar ID",
          );
        }

        const calendar = await getGoogleCalendarClientForConnection(connection);
        const response = await calendar.freebusy.query({
          requestBody: {
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            items: [{ id: calendarId }],
          },
        });

        const calendars = response.data.calendars;
        if (calendars == null) {
          throw new CalendarBusyLookupError(
            "Google free/busy response did not include calendars",
          );
        }

        return { data: { calendars } };
      }),
    ),
  );

  return mergeBusyIntervals(batches.flat());
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
    const connection = await getGoogleConnectionForWrite(userId);
    if (!connection) return null;
    const calendar = await getGoogleCalendarClientForConnection(connection);
    const calendarId = connection.calendarId ?? "primary";

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
      calendarId,
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
  const connections = await listSameProviderConnectionsForEvent(userId, "GOOGLE");
  const result = await tryEventConnections(connections, async (connection) => {
    const calendar = await getGoogleCalendarClientForConnection(connection);
    const calendarId = connection.calendarId ?? "primary";

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
      calendarId,
      eventId,
      requestBody: updateData,
      sendUpdates: "all",
    });

    return true;
  });

  if (result.ok) return true;
  if (result.reason === "error") {
    console.error("Error updating calendar event:", result.error);
  }
  return false;
}

export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const connections = await listSameProviderConnectionsForEvent(userId, "GOOGLE");
  const result = await tryEventConnections(connections, async (connection) => {
    const calendar = await getGoogleCalendarClientForConnection(connection);
    await calendar.events.delete({
      calendarId: connection.calendarId ?? "primary",
      eventId,
      sendUpdates: "all",
    });
    return true;
  });

  if (result.ok) return true;
  if (result.reason === "not_found") return true;
  if (result.reason === "error") {
    console.error("Error deleting calendar event:", result.error);
  }
  return false;
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
