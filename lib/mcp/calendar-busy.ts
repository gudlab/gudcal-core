import {
  checkWriteAgainstCalendarBusy,
  getBusyTimesForRead,
  type BusyInterval,
  type BusyLookup,
} from "../calendar/busy";

export async function mcpLoadAvailabilityBusyTimes(
  userId: string,
  from: Date,
  to: Date,
  lookup?: BusyLookup,
): Promise<BusyInterval[]> {
  return getBusyTimesForRead(userId, from, to, lookup);
}

export async function mcpRefuseWriteIfCalendarBusy(
  params: {
    userId: string;
    start: Date;
    end: Date;
    bufferBefore?: number;
    bufferAfter?: number;
    ignoreBusyOverlapping?: BusyInterval;
  },
  lookup?: BusyLookup,
): Promise<{ content: { type: "text"; text: string }[]; isError: true } | null> {
  const result = await checkWriteAgainstCalendarBusy(params, lookup);
  if (result.ok) return null;
  return {
    content: [{ type: "text", text: result.error }],
    isError: true,
  };
}
