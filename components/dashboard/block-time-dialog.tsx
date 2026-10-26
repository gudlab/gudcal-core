"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { toast } from "sonner";

import { createTimeOff, type TimeOffOverlapBooking } from "@/actions/time-off";
import {
  civilDateFromInstant,
  zonedEndOfDay,
  zonedStartOfDay,
} from "@/lib/booking-dates";
import { TIME_OFF_LABEL_COPY, type TimeOffLabel } from "@/lib/time-off";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type BlockTimeDraft = {
  startAt: string;
  endAt: string;
  allDay: boolean;
};

interface BlockTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: BlockTimeDraft | null;
  timezone: string;
}

function toDateTimeLocal(iso: string, timezone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return format(toZonedTime(date, timezone), "yyyy-MM-dd'T'HH:mm");
}

function toDateInput(iso: string, timezone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return civilDateFromInstant(date.toISOString(), timezone);
}

function fromDateTimeLocal(value: string, timezone: string): string {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = (timePart ?? "00:00").split(":").map(Number);
  return fromZonedTime(
    new Date(year, month - 1, day, hours, minutes, 0, 0),
    timezone,
  ).toISOString();
}

function fromDateInput(value: string, endOfDay: boolean, timezone: string): string {
  return (
    endOfDay ? zonedEndOfDay(value, timezone) : zonedStartOfDay(value, timezone)
  ).toISOString();
}

export function BlockTimeDialog({
  open,
  onOpenChange,
  draft,
  timezone,
}: BlockTimeDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [allDay, setAllDay] = useState(false);
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [label, setLabel] = useState<TimeOffLabel>("AWAY");
  const [reason, setReason] = useState("");
  const [overlaps, setOverlaps] = useState<TimeOffOverlapBooking[] | null>(null);

  useEffect(() => {
    if (!open || !draft) return;
    setAllDay(draft.allDay);
    setLabel("AWAY");
    setReason("");
    setOverlaps(null);
    if (draft.allDay) {
      setStartLocal(toDateInput(draft.startAt, timezone));
      setEndLocal(toDateInput(draft.endAt, timezone));
    } else {
      setStartLocal(toDateTimeLocal(draft.startAt, timezone));
      setEndLocal(toDateTimeLocal(draft.endAt, timezone));
    }
  }, [open, draft, timezone]);

  const buildPayload = (cancelOverlapping?: boolean) => {
    const startAt = allDay
      ? fromDateInput(startLocal, false, timezone)
      : fromDateTimeLocal(startLocal, timezone);
    const endAt = allDay
      ? fromDateInput(endLocal, true, timezone)
      : fromDateTimeLocal(endLocal, timezone);
    return {
      startAt,
      endAt,
      allDay,
      label,
      reason: reason.trim() || null,
      cancelOverlapping,
    };
  };

  const submit = (cancelOverlapping?: boolean) => {
    startTransition(async () => {
      const result = await createTimeOff(buildPayload(cancelOverlapping));
      if (result.status === "success") {
        toast.success("Time off added");
        setOverlaps(null);
        onOpenChange(false);
        router.refresh();
        return;
      }
      if (result.status === "overlap") {
        setOverlaps(result.bookings);
        return;
      }
      toast.error(result.message);
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block time</DialogTitle>
            <DialogDescription>
              Guests cannot book during this range. Times use {timezone.replaceAll("_", " ")}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="time-off-all-day">All day</Label>
              <Switch
                id="time-off-all-day"
                checked={allDay}
                onCheckedChange={(checked) => {
                  setAllDay(checked);
                  if (checked) {
                    const fallback = new Date().toISOString();
                    const startIso = startLocal.includes("T")
                      ? fromDateTimeLocal(startLocal, timezone)
                      : startLocal
                        ? fromDateInput(startLocal, false, timezone)
                        : fallback;
                    const endIso = endLocal.includes("T")
                      ? fromDateTimeLocal(endLocal, timezone)
                      : endLocal
                        ? fromDateInput(endLocal, true, timezone)
                        : startIso;
                    setStartLocal(toDateInput(startIso, timezone));
                    setEndLocal(toDateInput(endIso, timezone));
                  } else {
                    const start = startLocal.includes("T")
                      ? startLocal
                      : `${startLocal}T09:00`;
                    const end = endLocal.includes("T")
                      ? endLocal
                      : `${endLocal}T17:00`;
                    setStartLocal(start);
                    setEndLocal(end);
                  }
                }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="time-off-start">{allDay ? "Start date" : "Start"}</Label>
                <Input
                  id="time-off-start"
                  type={allDay ? "date" : "datetime-local"}
                  value={startLocal}
                  onChange={(event) => setStartLocal(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-off-end">{allDay ? "End date" : "End"}</Label>
                <Input
                  id="time-off-end"
                  type={allDay ? "date" : "datetime-local"}
                  value={endLocal}
                  onChange={(event) => setEndLocal(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Label</Label>
              <Select
                value={label}
                onValueChange={(value) => setLabel(value as TimeOffLabel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_OFF_LABEL_COPY).map(([value, copy]) => (
                    <SelectItem key={value} value={value}>
                      {copy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-off-reason">Reason (optional)</Label>
              <Textarea
                id="time-off-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                placeholder="Out of office, travel, clinic day..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => submit()} disabled={isPending || !startLocal || !endLocal}>
              Block time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(overlaps?.length)}
        onOpenChange={(next) => {
          if (!next) setOverlaps(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This overlaps existing bookings</AlertDialogTitle>
            <AlertDialogDescription>
              {overlaps?.length === 1
                ? "1 booking sits in this range. Cancel it and add the block?"
                : `${overlaps?.length ?? 0} bookings sit in this range. Cancel them and add the block?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
            {overlaps?.map((booking) => (
              <li key={booking.id}>
                {booking.eventTitle} with {booking.guestName}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep bookings</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                submit(true);
              }}
            >
              Cancel bookings and block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
