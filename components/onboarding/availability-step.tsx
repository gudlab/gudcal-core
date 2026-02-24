"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Icons } from "@/components/shared/icons";

const DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

/** Generate time options in 15-minute increments */
function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

interface ScheduleRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface AvailabilityStepProps {
  value: ScheduleRule[];
  onChange: (value: ScheduleRule[]) => void;
  onComplete: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function AvailabilityStep({
  value,
  onChange,
  onComplete,
  onBack,
  isSubmitting,
}: AvailabilityStepProps) {
  const enabledDays = new Set(value.map((r) => r.dayOfWeek));

  const toggleDay = (dayOfWeek: number) => {
    if (enabledDays.has(dayOfWeek)) {
      onChange(value.filter((r) => r.dayOfWeek !== dayOfWeek));
    } else {
      onChange([
        ...value,
        { dayOfWeek, startTime: "09:00", endTime: "17:00" },
      ]);
    }
  };

  const updateTime = (
    dayOfWeek: number,
    field: "startTime" | "endTime",
    time: string,
  ) => {
    onChange(
      value.map((r) =>
        r.dayOfWeek === dayOfWeek ? { ...r, [field]: time } : r,
      ),
    );
  };

  const getRuleForDay = (dayOfWeek: number) =>
    value.find((r) => r.dayOfWeek === dayOfWeek);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set your availability</CardTitle>
        <CardDescription>
          Choose the days and hours you&apos;re available for meetings. You can
          always change this later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {DAYS.map((day) => {
            const isEnabled = enabledDays.has(day.value);
            const rule = getRuleForDay(day.value);

            return (
              <div
                key={day.value}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleDay(day.value)}
                />
                <span
                  className={`w-12 text-sm font-medium ${
                    !isEnabled ? "text-muted-foreground" : ""
                  }`}
                >
                  {day.short}
                </span>

                {isEnabled && rule ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={rule.startTime}
                      onValueChange={(v) =>
                        updateTime(day.value, "startTime", v)
                      }
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
                      value={rule.endTime}
                      onValueChange={(v) =>
                        updateTime(day.value, "endTime", v)
                      }
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
                  <span className="text-sm text-muted-foreground">
                    Unavailable
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <Icons.chevronLeft className="mr-2 size-4" />
          Back
        </Button>
        <Button
          onClick={onComplete}
          disabled={value.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Icons.spinner className="mr-2 size-4 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              Complete Setup
              <Icons.check className="ml-2 size-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
