"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/shared/icons";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface EventTypeData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  duration: number;
  color: string;
  locationType: string;
  locationValue: string | null;
  customQuestions:
    | { id: string; type: string; label: string; required: boolean; options?: string[] }[]
    | null;
}

interface UserData {
  name: string | null;
  username: string;
  image: string | null;
  bio: string | null;
  timezone: string;
}

interface PrefillGuest {
  name: string;
  email: string;
  timezone: string;
  notes?: string;
}

interface BookingWidgetProps {
  eventType: EventTypeData;
  user: UserData;
  rescheduleUid?: string;
  prefillGuest?: PrefillGuest;
}

interface TimeSlot {
  time: string; // "09:00"
  dateTime: string; // ISO string in UTC
}

/** Shape returned by the availability API */
interface DayAvailability {
  date: string;
  slots: { start: string; end: string }[];
}

interface AvailabilityResponse {
  slots: DayAvailability[];
  timezone: string;
}

type Step = "date" | "time" | "form" | "confirmation";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function getGuestTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string, timezone: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
}

function formatDisplayTime(isoString: string, timezone: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
}

const LOCATION_LABELS: Record<string, string> = {
  IN_PERSON: "In Person",
  GOOGLE_MEET: "Google Meet",
  ZOOM: "Zoom",
  PHONE: "Phone Call",
  CUSTOM: "Custom",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export function BookingWidget({ eventType, user, rescheduleUid, prefillGuest }: BookingWidgetProps) {
  const isReschedule = !!rescheduleUid;
  const guestTimezone = useMemo(
    () => prefillGuest?.timezone ?? getGuestTimezone(),
    [prefillGuest?.timezone],
  );

  // Step management
  const [step, setStep] = useState<Step>("date");

  // Calendar state
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Month-level availability (pre-fetched)
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [monthSlots, setMonthSlots] = useState<Record<string, TimeSlot[]>>({});
  const [monthLoading, setMonthLoading] = useState(true);

  // Time slots (for selected date)
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Guest form
  const [guestName, setGuestName] = useState(prefillGuest?.name ?? "");
  const [guestEmail, setGuestEmail] = useState(prefillGuest?.email ?? "");
  const [notes, setNotes] = useState(prefillGuest?.notes ?? "");
  const [additionalGuests, setAdditionalGuests] = useState<{ name: string; email: string }[]>([]);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Confirmation data
  const [bookingResult, setBookingResult] = useState<{
    bookingId: string;
    uid: string;
    status: string;
  } | null>(null);

  // ── Fetch entire month's availability ────────────────────
  const fetchMonthAvailability = useCallback(
    async (year: number, month: number) => {
      setMonthLoading(true);
      try {
        const firstDay = formatDateKey(year, month, 1);
        const lastDay = formatDateKey(year, month, getDaysInMonth(year, month));

        const params = new URLSearchParams({
          eventSlug: eventType.slug,
          timezone: guestTimezone,
          from: firstDay,
          to: lastDay,
        });

        const res = await fetch(
          `/api/availability/${user.username}?${params.toString()}`,
        );

        if (!res.ok) throw new Error("Failed to load availability");

        const data: AvailabilityResponse = await res.json();

        // Build set of dates with available slots
        const datesWithSlots = new Set<string>();
        const slotsMap: Record<string, TimeSlot[]> = {};

        for (const day of data.slots) {
          if (day.slots.length > 0) {
            datesWithSlots.add(day.date);
            // Convert API slots to widget TimeSlot format
            slotsMap[day.date] = day.slots.map((s) => ({
              time: formatDisplayTime(s.start, guestTimezone),
              dateTime: s.start,
            }));
          }
        }

        setAvailableDates(datesWithSlots);
        setMonthSlots(slotsMap);
      } catch {
        // On error, fail open — don't disable any dates
        setAvailableDates(new Set());
        setMonthSlots({});
      } finally {
        setMonthLoading(false);
      }
    },
    [eventType.slug, guestTimezone, user.username],
  );

  // Fetch availability when month changes
  useEffect(() => {
    fetchMonthAvailability(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchMonthAvailability]);

  // ── Fetch slots for a single date (fallback) ─────────────
  const fetchSlots = useCallback(
    async (dateKey: string) => {
      setSlotsLoading(true);
      setSlotsError(null);
      setSlots([]);
      setSelectedSlot(null);

      try {
        const params = new URLSearchParams({
          date: dateKey,
          eventSlug: eventType.slug,
          timezone: guestTimezone,
        });

        const res = await fetch(
          `/api/availability/${user.username}?${params.toString()}`,
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load available times");
        }

        const data: AvailabilityResponse = await res.json();

        // Find the specific day in the response
        const dayData = data.slots.find((d) => d.date === dateKey);
        if (dayData && dayData.slots.length > 0) {
          setSlots(
            dayData.slots.map((s) => ({
              time: formatDisplayTime(s.start, guestTimezone),
              dateTime: s.start,
            })),
          );
        } else {
          setSlots([]);
        }
      } catch (err: any) {
        setSlotsError(err.message ?? "Something went wrong");
      } finally {
        setSlotsLoading(false);
      }
    },
    [eventType.slug, guestTimezone, user.username],
  );

  // ── Calendar navigation ────────────────────────────────────
  const goToPrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const isPrevDisabled =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // ── Date selection ─────────────────────────────────────────
  const handleDateClick = (dateKey: string) => {
    setSelectedDate(dateKey);

    // Use cached month slots if available, otherwise fetch
    const cached = monthSlots[dateKey];
    if (cached && cached.length > 0) {
      setSlots(cached);
      setSlotsLoading(false);
      setSlotsError(null);
      setSelectedSlot(null);
    } else {
      fetchSlots(dateKey);
    }

    setStep("time");
  };

  // ── Time selection ─────────────────────────────────────────
  const handleSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    if (isReschedule) {
      // In reschedule mode, skip the guest form and submit directly
      handleRescheduleSubmit(slot);
    } else {
      setStep("form");
    }
  };

  // ── Form submission ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const startTime = new Date(selectedSlot.dateTime);
      const endTime = new Date(
        startTime.getTime() + eventType.duration * 60 * 1000,
      );

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypeId: eventType.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestTimezone,
          notes: notes.trim() || undefined,
          additionalGuests: additionalGuests.length > 0 ? additionalGuests : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create booking");
      }

      const result = await res.json();
      setBookingResult(result);
      setStep("confirmation");
    } catch (err: any) {
      setSubmitError(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reschedule submission ─────────────────────────────────
  const handleRescheduleSubmit = async (slot: TimeSlot) => {
    if (!rescheduleUid || !prefillGuest) return;

    setSubmitting(true);
    setSubmitError(null);
    setStep("form"); // Show loading state

    try {
      const startTime = new Date(slot.dateTime);

      const res = await fetch("/api/bookings/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalBookingUid: rescheduleUid,
          eventTypeId: eventType.id,
          startTime: startTime.toISOString(),
          guestEmail: prefillGuest.email,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to reschedule booking");
      }

      const result = await res.json();
      setBookingResult(result);
      setStep("confirmation");
    } catch (err: any) {
      setSubmitError(err.message ?? "Something went wrong");
      setStep("time"); // Go back to time selection on error
    } finally {
      setSubmitting(false);
    }
  };

  // ── Calendar grid ──────────────────────────────────────────
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Left sidebar — event info */}
        <div className="border-b p-6 md:w-72 md:border-b-0 md:border-r">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              {user.image ? (
                <AvatarImage
                  alt={user.name ?? user.username}
                  src={user.image}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <AvatarFallback>
                  <Icons.user className="size-4" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user.name ?? user.username}
              </p>
            </div>
          </div>

          <h2 className="mt-4 text-xl font-bold" style={{ color: eventType.color }}>
            {eventType.title}
          </h2>

          {eventType.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {eventType.description}
            </p>
          )}

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Icons.clock className="size-4 shrink-0" />
              <span>{eventType.duration} min</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.video className="size-4 shrink-0" />
              <span>
                {LOCATION_LABELS[eventType.locationType] ?? eventType.locationType}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.globe className="size-4 shrink-0" />
              <span>{guestTimezone}</span>
            </div>
          </div>

          {/* Selected date/time summary */}
          {selectedDate && (
            <div className="mt-4 rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">
                {formatDisplayDate(selectedDate, guestTimezone)}
              </p>
              {selectedSlot && (
                <p className="text-muted-foreground">
                  {formatDisplayTime(selectedSlot.dateTime, guestTimezone)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right content — steps */}
        <CardContent className="flex-1 p-6">
          {/* ─── Step 1: Date Selection ─── */}
          {step === "date" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Select a Date</h3>

              {/* Month navigation */}
              <div className="mb-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevMonth}
                  disabled={isPrevDisabled}
                  aria-label="Previous month"
                >
                  <Icons.chevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-medium">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                  {monthLoading && (
                    <Icons.spinner className="ml-2 inline size-3 animate-spin text-muted-foreground" />
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextMonth}
                  aria-label="Next month"
                >
                  <Icons.chevronRight className="size-4" />
                </Button>
              </div>

              {/* Day labels */}
              <div className="mb-1 grid grid-cols-7 text-center">
                {DAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="py-1 text-xs font-medium text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} />;
                  }

                  const dateKey = formatDateKey(viewYear, viewMonth, day);
                  const isToday = dateKey === todayKey;
                  const isPast =
                    new Date(viewYear, viewMonth, day) <
                    new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      today.getDate(),
                    );
                  const isUnavailable =
                    !monthLoading && !isPast && !availableDates.has(dateKey);
                  const isDisabled = isPast || isUnavailable;
                  const isSelected = dateKey === selectedDate;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleDateClick(dateKey)}
                      className={cn(
                        "mx-auto flex size-10 items-center justify-center rounded-full text-sm transition-colors",
                        isDisabled && "cursor-not-allowed text-muted-foreground/40",
                        !isDisabled &&
                          !isSelected &&
                          "hover:bg-accent hover:text-accent-foreground",
                        !isDisabled &&
                          !isSelected &&
                          availableDates.has(dateKey) &&
                          "font-medium",
                        isToday && !isSelected && !isDisabled && "border border-primary",
                        isSelected &&
                          "bg-primary text-primary-foreground font-semibold",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Step 2: Time Selection ─── */}
          {step === "time" && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStep("date")}
                  aria-label="Back to date selection"
                >
                  <Icons.chevronLeft className="size-4" />
                </Button>
                <h3 className="text-lg font-semibold">
                  {selectedDate
                    ? formatDisplayDate(selectedDate, guestTimezone)
                    : "Select a Time"}
                </h3>
              </div>

              {slotsLoading && (
                <div className="flex items-center justify-center py-12">
                  <Icons.spinner className="size-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {slotsError && (
                <div className="rounded-md bg-destructive/10 p-4 text-center text-sm text-destructive">
                  {slotsError}
                </div>
              )}

              {submitError && isReschedule && (
                <div className="mb-4 rounded-md bg-destructive/10 p-4 text-center text-sm text-destructive">
                  {submitError}
                </div>
              )}

              {!slotsLoading && !slotsError && slots.length === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No available times for this date.
                </p>
              )}

              {!slotsLoading && slots.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((slot) => (
                    <Button
                      key={slot.dateTime}
                      variant={
                        selectedSlot?.dateTime === slot.dateTime
                          ? "default"
                          : "outline-solid"
                      }
                      className="w-full"
                      disabled={submitting}
                      onClick={() => handleSlotClick(slot)}
                    >
                      {formatDisplayTime(slot.dateTime, guestTimezone)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Step 3: Guest Form (or reschedule loading) ─── */}
          {step === "form" && isReschedule && submitting && (
            <div className="flex flex-col items-center justify-center py-16">
              <Icons.spinner className="size-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">Rescheduling your booking...</p>
            </div>
          )}

          {step === "form" && !isReschedule && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStep("time")}
                  aria-label="Back to time selection"
                >
                  <Icons.chevronLeft className="size-4" />
                </Button>
                <h3 className="text-lg font-semibold">Your Details</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">Name *</Label>
                  <Input
                    id="guestName"
                    required
                    maxLength={100}
                    placeholder="Your name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guestEmail">Email *</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                  />
                </div>

                {/* Additional Guests */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Additional Guests{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    {!showAddGuest && additionalGuests.length < 10 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs"
                        onClick={() => setShowAddGuest(true)}
                      >
                        <Icons.add className="mr-1 size-3" />
                        Add guest
                      </Button>
                    )}
                  </div>

                  {additionalGuests.map((guest, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {guest.name} &lt;{guest.email}&gt;
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={() =>
                          setAdditionalGuests((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <Icons.close className="size-3" />
                      </Button>
                    </div>
                  ))}

                  {showAddGuest && (
                    <div className="space-y-2 rounded-md border p-3">
                      <Input
                        placeholder="Guest name"
                        maxLength={200}
                        value={newGuestName}
                        onChange={(e) => setNewGuestName(e.target.value)}
                      />
                      <Input
                        type="email"
                        placeholder="Guest email"
                        maxLength={320}
                        value={newGuestEmail}
                        onChange={(e) => setNewGuestEmail(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!newGuestName.trim() || !newGuestEmail.trim()}
                          onClick={() => {
                            setAdditionalGuests((prev) => [
                              ...prev,
                              { name: newGuestName.trim(), email: newGuestEmail.trim() },
                            ]);
                            setNewGuestName("");
                            setNewGuestEmail("");
                            setShowAddGuest(false);
                          }}
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNewGuestName("");
                            setNewGuestEmail("");
                            setShowAddGuest(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Additional Notes{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    maxLength={1000}
                    placeholder="Anything you'd like to share beforehand..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {submitError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {submitError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || !guestName.trim() || !guestEmail.trim()}
                >
                  {submitting ? (
                    <>
                      <Icons.spinner className="mr-2 size-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* ─── Step 4: Confirmation ─── */}
          {step === "confirmation" && bookingResult && selectedSlot && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Icons.check className="size-8 text-green-600 dark:text-green-400" />
              </div>

              <h3 className="text-xl font-bold">
                {isReschedule ? "Booking Rescheduled" : "Booking Confirmed"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isReschedule
                  ? `Your booking has been rescheduled. A confirmation email has been sent to ${guestEmail || prefillGuest?.email}.`
                  : `A confirmation email has been sent to ${guestEmail}.`}
              </p>

              <div className="mt-6 w-full max-w-sm space-y-3 rounded-lg border p-4 text-left text-sm">
                <div>
                  <span className="font-medium">What: </span>
                  <span>{eventType.title}</span>
                </div>
                <div>
                  <span className="font-medium">When: </span>
                  <span>
                    {formatDisplayDate(selectedDate!, guestTimezone)},{" "}
                    {formatDisplayTime(selectedSlot.dateTime, guestTimezone)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Duration: </span>
                  <span>{eventType.duration} min</span>
                </div>
                <div>
                  <span className="font-medium">Where: </span>
                  <span>
                    {LOCATION_LABELS[eventType.locationType] ??
                      eventType.locationType}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Status: </span>
                  <Badge
                    variant={
                      bookingResult.status === "CONFIRMED"
                        ? "default"
                        : "secondary"
                    }
                    className="ml-1"
                  >
                    {bookingResult.status}
                  </Badge>
                </div>
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                You&apos;re all set! You can close this page.
              </p>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
