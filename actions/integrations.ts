"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  disconnectCalendarConnection,
  getCalendarConnectionForUser,
  setPrimaryCalendarConnection,
  updateCalendarConnectionSettings,
} from "@/lib/calendar/connections";
import { listGoogleCalendars } from "@/lib/calendar/google";

export type CalendarOption = {
  id: string;
  summary: string;
  primary: boolean;
};

export async function disconnectCalendar(connectionId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    await disconnectCalendarConnection(userId, connectionId);

    revalidatePath("/dashboard/integrations");

    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function setPrimaryCalendar(connectionId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    await setPrimaryCalendarConnection(userId, connectionId);
    revalidatePath("/dashboard/integrations");
    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function updateCalendarSettings(input: {
  connectionId: string;
  calendarId?: string;
  includeInBusyCheck?: boolean;
}) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error" as const, message: "Not authenticated" };
    }

    await updateCalendarConnectionSettings(userId, input.connectionId, {
      calendarId: input.calendarId,
      includeInBusyCheck: input.includeInBusyCheck,
    });
    revalidatePath("/dashboard/integrations");
    return { status: "success" as const };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error" as const, message: error.message };
    }
    return { status: "error" as const, message: "Something went wrong" };
  }
}

export async function listCalendarsForConnection(
  connectionId: string,
): Promise<
  | { status: "success"; calendars: CalendarOption[] }
  | { status: "error"; message: string }
> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { status: "error", message: "Not authenticated" };
    }

    const connection = await getCalendarConnectionForUser(userId, connectionId);
    if (!connection) {
      return { status: "error", message: "Calendar connection not found" };
    }

    if (connection.provider === "GOOGLE") {
      return {
        status: "success",
        calendars: await listGoogleCalendars(connection),
      };
    }

    return { status: "success", calendars: [] };
  } catch (error) {
    if (error instanceof Error) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Something went wrong" };
  }
}
