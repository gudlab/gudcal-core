"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  listCalendarsForConnection,
  setPrimaryCalendar,
  updateCalendarSettings,
  type CalendarOption,
} from "@/actions/integrations";
import { DisconnectCalendarButton } from "@/components/integrations/disconnect-calendar-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Icons } from "@/components/shared/icons";

export type CalendarAccount = {
  id: string;
  provider: "GOOGLE" | "OUTLOOK";
  email: string | null;
  calendarId: string | null;
  isPrimary: boolean;
  includeInBusyCheck: boolean;
};

interface CalendarAccountRowProps {
  account: CalendarAccount;
}

export function CalendarAccountRow({ account }: CalendarAccountRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listCalendarsForConnection(account.id).then((result) => {
      if (cancelled) return;
      setLoadingCalendars(false);
      if (result.status === "success") {
        setCalendars(result.calendars);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [account.id]);

  const handleCalendarChange = (calendarId: string) => {
    startTransition(async () => {
      const result = await updateCalendarSettings({
        connectionId: account.id,
        calendarId,
      });
      if (result.status === "success") {
        toast.success("Calendar updated");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleBusyToggle = (checked: boolean) => {
    startTransition(async () => {
      const result = await updateCalendarSettings({
        connectionId: account.id,
        includeInBusyCheck: checked,
      });
      if (result.status === "success") {
        toast.success(
          checked
            ? "This calendar is checked for conflicts"
            : "This calendar is ignored for conflicts",
        );
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleSetPrimary = () => {
    startTransition(async () => {
      const result = await setPrimaryCalendar(account.id);
      if (result.status === "success") {
        toast.success("Primary calendar updated");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const calendarValue = account.calendarId ?? undefined;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            {account.email ?? "Connected account"}
          </p>
          {account.isPrimary ? (
            <Badge variant="default">Primary write</Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!account.isPrimary ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetPrimary}
              disabled={isPending}
            >
              Set as primary
            </Button>
          ) : null}
          <DisconnectCalendarButton connectionId={account.id} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`calendar-${account.id}`}>Calendar to check</Label>
          <Select
            value={calendarValue}
            onValueChange={handleCalendarChange}
            disabled={isPending || loadingCalendars}
          >
            <SelectTrigger id={`calendar-${account.id}`}>
              <SelectValue
                placeholder={
                  loadingCalendars ? "Loading calendars…" : "Select a calendar"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {calendars.map((calendar) => (
                <SelectItem key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                  {calendar.primary ? " (default)" : ""}
                </SelectItem>
              ))}
              {account.calendarId &&
              !calendars.some((c) => c.id === account.calendarId) ? (
                <SelectItem value={account.calendarId}>
                  {account.calendarId}
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          <div>
            <Label htmlFor={`busy-${account.id}`}>Use for availability</Label>
            <p className="text-xs text-muted-foreground">
              Block booking slots when this calendar is busy
            </p>
          </div>
          {isPending ? (
            <Icons.spinner className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              id={`busy-${account.id}`}
              checked={account.includeInBusyCheck}
              onCheckedChange={handleBusyToggle}
              disabled={isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
