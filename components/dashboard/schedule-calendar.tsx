"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addMonths, addWeeks, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { toast } from "sonner";

import { deleteTimeOff } from "@/actions/time-off";
import { BookingCard } from "@/components/bookings/booking-card";
import {
  BlockTimeDialog,
  type BlockTimeDraft,
} from "@/components/dashboard/block-time-dialog";
import { CalendarLegend } from "@/components/dashboard/calendar-legend";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Icons } from "@/components/shared/icons";
import {
  dayBounds,
  isWorkingDay,
  itemsOnDay,
  monthGridDays,
  rangeOverlaps,
  weekDays,
  workingWindowsForDate,
  type WorkingRule,
  zonedDateKey,
} from "@/lib/dashboard-calendar";
import { TIME_OFF_LABEL_COPY, type TimeOffLabel } from "@/lib/time-off";

export type CalendarBooking = {
  id: string;
  guestName: string;
  guestEmail: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "RESCHEDULED" | "NO_SHOW";
  notes: string | null;
  eventType: {
    title: string;
    duration: number;
    color: string;
    locationType: "IN_PERSON" | "GOOGLE_MEET" | "ZOOM" | "PHONE" | "CUSTOM";
  };
};

export type CalendarTimeOff = {
  id: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  reason: string | null;
  label: TimeOffLabel;
};

type View = "month" | "week";

const HOUR_HEIGHT = 48;
const WEEK_HOURS = 24;
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_OFF_CHIP =
  "bg-neutral-400 text-neutral-900 dark:bg-neutral-500 dark:text-neutral-50 [background-image:repeating-linear-gradient(-45deg,transparent,transparent_3px,rgba(0,0,0,0.16)_3px,rgba(0,0,0,0.16)_6px)]";

function zoned(date: Date | string, timezone: string) {
  return toZonedTime(new Date(date), timezone);
}

function bookingRange(booking: CalendarBooking) {
  return { start: new Date(booking.startTime), end: new Date(booking.endTime) };
}

function timeOffRange(block: CalendarTimeOff) {
  return { start: new Date(block.startAt), end: new Date(block.endAt) };
}

interface ScheduleCalendarProps {
  bookings: CalendarBooking[];
  timeOffs: CalendarTimeOff[];
  workingHours: WorkingRule[];
  timezone: string;
  weekStartsOn: 0 | 1;
}

export function ScheduleCalendar({
  bookings,
  timeOffs,
  workingHours,
  timezone,
  weekStartsOn,
}: ScheduleCalendarProps) {
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<CalendarTimeOff | null>(null);
  const [draft, setDraft] = useState<BlockTimeDraft | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dragRef = useRef<{
    anchorStart: Date;
    anchorEnd: Date;
    currentStart: Date;
    currentEnd: Date;
    allDay: boolean;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    start: Date;
    end: Date;
    allDay: boolean;
  } | null>(null);

  function previewFromDrag(drag: {
    anchorStart: Date;
    anchorEnd: Date;
    currentStart: Date;
    currentEnd: Date;
    allDay: boolean;
  }) {
    const start =
      drag.anchorStart < drag.currentStart ? drag.anchorStart : drag.currentStart;
    const end = drag.anchorEnd > drag.currentEnd ? drag.anchorEnd : drag.currentEnd;
    return { start, end, allDay: drag.allDay };
  }

  const parsedBookings = useMemo(
    () => bookings.map((booking) => ({ ...booking, ...bookingRange(booking) })),
    [bookings],
  );
  const parsedBlocks = useMemo(
    () => timeOffs.map((block) => ({ ...block, ...timeOffRange(block) })),
    [timeOffs],
  );

  const monthDays = useMemo(
    () => monthGridDays(cursor, timezone, weekStartsOn),
    [cursor, timezone, weekStartsOn],
  );
  const week = useMemo(
    () => weekDays(cursor, timezone, weekStartsOn),
    [cursor, timezone, weekStartsOn],
  );

  const title = format(zoned(cursor, timezone), view === "month" ? "MMMM yyyy" : "MMM d, yyyy");

  const weekdayHeaders = Array.from({ length: 7 }, (_, i) => WEEKDAY_SHORT[(weekStartsOn + i) % 7]);

  function openBlock(start: Date, end: Date, allDay: boolean) {
    setDraft({
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      allDay,
    });
    setBlockOpen(true);
  }

  function finishDrag() {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragPreview(null);
    if (!drag) return;
    const { start, end, allDay } = previewFromDrag(drag);
    openBlock(start, end, allDay);
  }

  const finishDragRef = useRef(finishDrag);
  finishDragRef.current = finishDrag;

  useEffect(() => {
    const onUp = () => {
      if (dragRef.current) finishDragRef.current();
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, []);

  async function handleDeleteBlock() {
    if (!selectedBlock) return;
    setDeleting(true);
    const result = await deleteTimeOff(selectedBlock.id);
    setDeleting(false);
    if (result.status === "success") {
      toast.success("Time off removed");
      setSelectedBlock(null);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCursor((current) =>
                view === "month" ? addMonths(current, -1) : addWeeks(current, -1),
              )
            }
            aria-label="Previous"
          >
            <Icons.chevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCursor((current) =>
                view === "month" ? addMonths(current, 1) : addWeeks(current, 1),
              )
            }
            aria-label="Next"
          >
            <Icons.chevronRight className="size-4" />
          </Button>
          <h2 className="min-w-[9rem] text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md bg-muted p-1">
            <Button
              size="sm"
              variant={view === "week" ? "secondary" : "ghost"}
              onClick={() => setView("week")}
            >
              Week
            </Button>
            <Button
              size="sm"
              variant={view === "month" ? "secondary" : "ghost"}
              onClick={() => setView("month")}
            >
              Month
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const start = new Date();
              start.setMinutes(0, 0, 0);
              const end = new Date(start.getTime() + 60 * 60 * 1000);
              openBlock(start, end, false);
            }}
          >
            Block time
          </Button>
        </div>
      </div>

      <CalendarLegend />

      {view === "month" ? (
        <MonthGrid
          days={monthDays}
          weekdayHeaders={weekdayHeaders}
          cursor={cursor}
          timezone={timezone}
          workingHours={workingHours}
          bookings={parsedBookings}
          timeOffs={parsedBlocks}
          dragPreview={dragPreview}
          onBookingClick={setSelectedBooking}
          onBlockClick={setSelectedBlock}
          onDayPointerDown={(day) => {
            const { start, end } = dayBounds(day, timezone);
            dragRef.current = {
              anchorStart: start,
              anchorEnd: end,
              currentStart: start,
              currentEnd: end,
              allDay: true,
            };
            setDragPreview(previewFromDrag(dragRef.current));
          }}
          onDayPointerEnter={(day) => {
            if (!dragRef.current) return;
            const { start, end } = dayBounds(day, timezone);
            dragRef.current = {
              ...dragRef.current,
              currentStart: start,
              currentEnd: end,
            };
            setDragPreview(previewFromDrag(dragRef.current));
          }}
          onDayPointerUp={finishDrag}
        />
      ) : (
        <WeekGrid
          days={week}
          timezone={timezone}
          workingHours={workingHours}
          bookings={parsedBookings}
          timeOffs={parsedBlocks}
          dragPreview={dragPreview}
          onBookingClick={setSelectedBooking}
          onBlockClick={setSelectedBlock}
          onSlotPointerDown={(start, end) => {
            dragRef.current = {
              anchorStart: start,
              anchorEnd: end,
              currentStart: start,
              currentEnd: end,
              allDay: false,
            };
            setDragPreview(previewFromDrag(dragRef.current));
          }}
          onSlotPointerEnter={(start, end) => {
            if (!dragRef.current) return;
            dragRef.current = {
              ...dragRef.current,
              currentStart: start,
              currentEnd: end,
            };
            setDragPreview(previewFromDrag(dragRef.current));
          }}
          onSlotPointerUp={finishDrag}
        />
      )}

      <Sheet
        open={Boolean(selectedBooking)}
        onOpenChange={(open) => {
          if (!open) setSelectedBooking(null);
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Booking</SheetTitle>
            <SheetDescription>Confirm, reschedule, or cancel.</SheetDescription>
          </SheetHeader>
          {selectedBooking ? (
            <div className="mt-4">
              <BookingCard
                booking={selectedBooking}
                showActions
                onActionComplete={() => setSelectedBooking(null)}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(selectedBlock)}
        onOpenChange={(open) => {
          if (!open) setSelectedBlock(null);
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Time off</SheetTitle>
            <SheetDescription>
              {selectedBlock
                ? TIME_OFF_LABEL_COPY[selectedBlock.label]
                : "Blocked time"}
            </SheetDescription>
          </SheetHeader>
          {selectedBlock ? (
            <div className="mt-4 space-y-3 text-sm">
              <p>
                {selectedBlock.allDay
                  ? `${format(zoned(selectedBlock.startAt, timezone), "MMM d, yyyy")} to ${format(zoned(selectedBlock.endAt, timezone), "MMM d, yyyy")}`
                  : `${format(zoned(selectedBlock.startAt, timezone), "MMM d, yyyy h:mm a")} to ${format(zoned(selectedBlock.endAt, timezone), "h:mm a")}`}
              </p>
              {selectedBlock.reason ? (
                <p className="text-muted-foreground">{selectedBlock.reason}</p>
              ) : null}
              <Button
                variant="outline"
                onClick={handleDeleteBlock}
                disabled={deleting}
              >
                <Icons.trash className="mr-2 size-4" />
                Delete block
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <BlockTimeDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        draft={draft}
        timezone={timezone}
      />
    </div>
  );
}

type ParsedBooking = CalendarBooking & { start: Date; end: Date };
type ParsedBlock = CalendarTimeOff & { start: Date; end: Date };

function bookingChipClass(status: CalendarBooking["status"]) {
  if (status === "PENDING") return "bg-amber-500 text-white hover:bg-amber-600";
  return "bg-emerald-600 text-white hover:bg-emerald-700";
}

function MonthGrid({
  days,
  weekdayHeaders,
  cursor,
  timezone,
  workingHours,
  bookings,
  timeOffs,
  dragPreview,
  onBookingClick,
  onBlockClick,
  onDayPointerDown,
  onDayPointerEnter,
  onDayPointerUp,
}: {
  days: Date[];
  weekdayHeaders: string[];
  cursor: Date;
  timezone: string;
  workingHours: WorkingRule[];
  bookings: ParsedBooking[];
  timeOffs: ParsedBlock[];
  dragPreview: { start: Date; end: Date; allDay: boolean } | null;
  onBookingClick: (booking: CalendarBooking) => void;
  onBlockClick: (block: CalendarTimeOff) => void;
  onDayPointerDown: (day: Date) => void;
  onDayPointerEnter: (day: Date) => void;
  onDayPointerUp: () => void;
}) {
  const cursorMonth = zoned(cursor, timezone).getMonth();
  const todayKey = zonedDateKey(new Date(), timezone);

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
        {weekdayHeaders.map((day) => (
          <div key={day} className="px-2 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = zonedDateKey(day, timezone);
          const inMonth = zoned(day, timezone).getMonth() === cursorMonth;
          const working = isWorkingDay(day, workingHours, timezone);
          const dayBookings = itemsOnDay(day, bookings, timezone);
          const dayBlocks = itemsOnDay(day, timeOffs, timezone);
          const bounds = dayBounds(day, timezone);
          const selected =
            dragPreview &&
            rangeOverlaps(
              dragPreview.start,
              dragPreview.end,
              bounds.start,
              bounds.end,
            );
          const chips = [
            ...dayBlocks.map((block) => ({
              key: block.id,
              label: TIME_OFF_LABEL_COPY[block.label],
              className: TIME_OFF_CHIP,
              onClick: () => onBlockClick(block),
            })),
            ...dayBookings.map((booking) => ({
              key: booking.id,
              label: booking.eventType.title,
              className: bookingChipClass(booking.status),
              onClick: () => onBookingClick(booking),
            })),
          ];
          const visible = chips.slice(0, 3);
          const extra = chips.length - visible.length;

          return (
            <div
              key={key}
              className={`min-h-[7.5rem] border-b border-r p-1.5 last:border-r-0 ${
                working
                  ? "bg-emerald-50 dark:bg-emerald-950/20"
                  : "bg-muted/30"
              } ${inMonth ? "" : "opacity-50"} ${
                selected ? "ring-1 ring-inset ring-neutral-400" : ""
              }`}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("button")) return;
                onDayPointerDown(day);
              }}
              onPointerEnter={() => onDayPointerEnter(day)}
              onPointerUp={onDayPointerUp}
            >
              <div
                className={`mb-1 text-xs font-medium ${
                  key === todayKey ? "text-emerald-700 dark:text-emerald-400" : ""
                }`}
              >
                {format(zoned(day, timezone), "d")}
              </div>
              <div className="space-y-1">
                {visible.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] ${chip.className}`}
                    onClick={chip.onClick}
                  >
                    {chip.label}
                  </button>
                ))}
                {extra > 0 ? (
                  <p className="px-1 text-[11px] text-muted-foreground">+{extra} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  days,
  timezone,
  workingHours,
  bookings,
  timeOffs,
  dragPreview,
  onBookingClick,
  onBlockClick,
  onSlotPointerDown,
  onSlotPointerEnter,
  onSlotPointerUp,
}: {
  days: Date[];
  timezone: string;
  workingHours: WorkingRule[];
  bookings: ParsedBooking[];
  timeOffs: ParsedBlock[];
  dragPreview: { start: Date; end: Date; allDay: boolean } | null;
  onBookingClick: (booking: CalendarBooking) => void;
  onBlockClick: (block: CalendarTimeOff) => void;
  onSlotPointerDown: (start: Date, end: Date) => void;
  onSlotPointerEnter: (start: Date, end: Date) => void;
  onSlotPointerUp: () => void;
}) {
  const hours = Array.from({ length: WEEK_HOURS }, (_, hour) => hour);
  const todayKey = zonedDateKey(new Date(), timezone);

  return (
    <div className="overflow-auto rounded-lg border">
      <div
        className="grid min-w-[720px]"
        style={{ gridTemplateColumns: "3.5rem repeat(7, minmax(0, 1fr))" }}
      >
        <div className="border-b" />
        {days.map((day) => {
          const key = zonedDateKey(day, timezone);
          return (
            <div
              key={key}
              className={`border-b border-l px-2 py-2 text-sm ${
                key === todayKey ? "font-semibold text-emerald-700 dark:text-emerald-400" : ""
              }`}
            >
              <div className="text-xs text-muted-foreground">
                {format(zoned(day, timezone), "EEE")}
              </div>
              {format(zoned(day, timezone), "MMM d")}
            </div>
          );
        })}

        <div className="border-b py-1" />
        {days.map((day) => {
          const allDayBlocks = itemsOnDay(day, timeOffs, timezone).filter((block) => block.allDay);
          return (
            <div key={`${zonedDateKey(day, timezone)}-allday`} className="min-h-10 space-y-1 border-b border-l p-1">
              {allDayBlocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] ${TIME_OFF_CHIP}`}
                  onClick={() => onBlockClick(block)}
                >
                  {TIME_OFF_LABEL_COPY[block.label]}
                </button>
              ))}
            </div>
          );
        })}

        <div className="relative">
          {hours.map((hour) => (
            <div
              key={hour}
              className="border-b pr-1 text-right text-[10px] text-muted-foreground"
              style={{ height: HOUR_HEIGHT }}
            >
              {hour === 0 ? "" : format(new Date(2000, 0, 1, hour), "h a")}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const { start: dayStart, end: dayEnd } = dayBounds(day, timezone);
          const windows = workingWindowsForDate(day, workingHours, timezone);
          const dayBookings = itemsOnDay(day, bookings, timezone);
          const timedBlocks = itemsOnDay(day, timeOffs, timezone).filter((block) => !block.allDay);
          return (
            <div
              key={`${zonedDateKey(day, timezone)}-col`}
              className="relative border-l bg-muted/25"
              style={{ height: HOUR_HEIGHT * WEEK_HOURS }}
              onPointerUp={onSlotPointerUp}
            >
              {windows.map((window, index) => {
                const top = ((window.start.getTime() - dayStart.getTime()) / 3_600_000) * HOUR_HEIGHT;
                const height = ((window.end.getTime() - window.start.getTime()) / 3_600_000) * HOUR_HEIGHT;
                return (
                  <div
                    key={index}
                    className="pointer-events-none absolute inset-x-0 bg-emerald-50 dark:bg-emerald-950/25"
                    style={{ top, height }}
                  />
                );
              })}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-b border-border/60"
                  style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                />
              ))}
              {Array.from({ length: WEEK_HOURS * 2 }, (_, slot) => {
                const start = new Date(dayStart.getTime() + slot * 30 * 60 * 1000);
                const end = new Date(start.getTime() + 30 * 60 * 1000);
                const selected =
                  dragPreview &&
                  !dragPreview.allDay &&
                  rangeOverlaps(dragPreview.start, dragPreview.end, start, end);
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`absolute inset-x-0 ${selected ? "bg-neutral-400/30" : ""}`}
                    style={{ top: slot * (HOUR_HEIGHT / 2), height: HOUR_HEIGHT / 2 }}
                    aria-label={`Block ${format(zoned(start, timezone), "EEE h:mm a")}`}
                    onPointerDown={() => onSlotPointerDown(start, end)}
                    onPointerEnter={() => onSlotPointerEnter(start, end)}
                  />
                );
              })}
              {timedBlocks.map((block) => (
                <WeekEvent
                  key={block.id}
                  start={block.start}
                  end={block.end}
                  dayStart={dayStart}
                  dayEnd={dayEnd}
                  className={`z-10 ${TIME_OFF_CHIP}`}
                  label={TIME_OFF_LABEL_COPY[block.label]}
                  onClick={() => onBlockClick(block)}
                />
              ))}
              {dayBookings.map((booking) => (
                <WeekEvent
                  key={booking.id}
                  start={booking.start}
                  end={booking.end}
                  dayStart={dayStart}
                  dayEnd={dayEnd}
                  className={`z-20 ${bookingChipClass(booking.status)}`}
                  label={`${booking.eventType.title} · ${booking.guestName}`}
                  onClick={() => onBookingClick(booking)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekEvent({
  start,
  end,
  dayStart,
  dayEnd,
  className,
  label,
  onClick,
}: {
  start: Date;
  end: Date;
  dayStart: Date;
  dayEnd: Date;
  className: string;
  label: string;
  onClick: () => void;
}) {
  const clampedStart = start < dayStart ? dayStart : start;
  const clampedEnd = end > dayEnd ? dayEnd : end;
  const top = ((clampedStart.getTime() - dayStart.getTime()) / 3_600_000) * HOUR_HEIGHT;
  const height = Math.max(
    18,
    ((clampedEnd.getTime() - clampedStart.getTime()) / 3_600_000) * HOUR_HEIGHT,
  );

  return (
    <button
      type="button"
      className={`absolute inset-x-1 overflow-hidden rounded px-1.5 py-0.5 text-left text-[11px] leading-tight ${className}`}
      style={{ top, height }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
