"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";

import { updateAvailability } from "@/actions/availability";
import {
  updateAvailabilitySchema,
  type UpdateAvailabilityFormData,
} from "@/lib/validations/availability";
import { POPULAR_TIMEZONES } from "@/config/timezones";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Icons } from "@/components/shared/icons";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Generate time options in 15-minute increments from 00:00 to 23:45
 */
function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      const value = `${hh}:${mm}`;
      // Format for display: "9:00 AM"
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${mm} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface WeeklyScheduleEditorProps {
  availabilityId: string;
  defaultValues: UpdateAvailabilityFormData;
}

export function WeeklyScheduleEditor({
  availabilityId,
  defaultValues,
}: WeeklyScheduleEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Build per-day state from rules
  const buildDaySchedules = (): DaySchedule[] => {
    const days: DaySchedule[] = Array.from({ length: 7 }, () => ({
      enabled: false,
      startTime: "09:00",
      endTime: "17:00",
    }));

    for (const rule of defaultValues.rules) {
      days[rule.dayOfWeek] = {
        enabled: true,
        startTime: rule.startTime,
        endTime: rule.endTime,
      };
    }

    return days;
  };

  const form = useForm<UpdateAvailabilityFormData>({
    resolver: zodResolver(updateAvailabilitySchema),
    defaultValues: {
      name: defaultValues.name,
      timezone: defaultValues.timezone,
      rules: defaultValues.rules,
      dateOverrides: defaultValues.dateOverrides ?? [],
    },
  });

  // We track per-day toggle + times in local state synced with form
  const daySchedulesDefault = buildDaySchedules();

  const syncRulesToForm = (days: DaySchedule[]) => {
    const rules = days
      .map((day, index) =>
        day.enabled
          ? {
              dayOfWeek: index,
              startTime: day.startTime,
              endTime: day.endTime,
            }
          : null,
      )
      .filter(Boolean) as UpdateAvailabilityFormData["rules"];
    form.setValue("rules", rules, { shouldValidate: true });
  };

  const onSubmit = (data: UpdateAvailabilityFormData) => {
    startTransition(async () => {
      const result = await updateAvailability(availabilityId, data);

      if (result.status === "success") {
        toast.success("Availability updated");
        router.push("/dashboard/availability");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-6">
        {/* Name & Timezone */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Schedule Name</Label>
              <Input
                id="name"
                placeholder="e.g. Working Hours"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={form.watch("timezone")}
                onValueChange={(v) =>
                  form.setValue("timezone", v, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.timezone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.timezone.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <DayRows
              initialDays={daySchedulesDefault}
              onDaysChange={syncRulesToForm}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Icons.spinner className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}

/**
 * Renders a row for each day of the week with toggle and time selectors.
 * Manages its own local state and syncs back to the parent form.
 */
function DayRows({
  initialDays,
  onDaysChange,
}: {
  initialDays: DaySchedule[];
  onDaysChange: (days: DaySchedule[]) => void;
}) {
  const [days, setDays] = useState<DaySchedule[]>(initialDays);

  const updateDay = (index: number, updates: Partial<DaySchedule>) => {
    const next = days.map((d, i) => (i === index ? { ...d, ...updates } : d));
    setDays(next);
    onDaysChange(next);
  };

  return (
    <div className="space-y-3">
      {days.map((day, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-lg border p-3"
        >
          <Switch
            checked={day.enabled}
            onCheckedChange={(checked) => updateDay(index, { enabled: checked })}
          />

          <span className="w-24 text-sm font-medium">
            {DAY_LABELS[index]}
          </span>

          {day.enabled ? (
            <div className="flex items-center gap-2">
              <Select
                value={day.startTime}
                onValueChange={(v) => updateDay(index, { startTime: v })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-sm text-muted-foreground">to</span>

              <Select
                value={day.endTime}
                onValueChange={(v) => updateDay(index, { endTime: v })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Unavailable</span>
          )}
        </div>
      ))}
    </div>
  );
}
