"use client";

import { useMemo } from "react";

import { getGroupedTimezones, type TimezoneGroup } from "@/config/timezones";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GuestTimezonePickerProps {
  value: string;
  onChange: (timeZone: string) => void;
  className?: string;
  id?: string;
}

export function GuestTimezonePicker({
  value,
  onChange,
  className,
  id = "guest-timezone",
}: GuestTimezonePickerProps) {
  const groups = useMemo(() => {
    const grouped = getGroupedTimezones();
    const known = grouped.some((group) =>
      group.options.some((opt) => opt.value === value),
    );
    if (known || !value) return grouped;
    const extra: TimezoneGroup = {
      label: "Current",
      options: [{ value, label: value.replace(/_/g, " "), offset: "" }],
    };
    return [extra, ...grouped];
  }, [value]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-label="Timezone"
        className={cn("h-8 min-w-0 text-xs", className)}
      >
        <SelectValue placeholder="Timezone" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {groups.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">
              {group.label}
            </SelectLabel>
            {group.options.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
                {tz.offset ? (
                  <span className="text-muted-foreground"> ({tz.offset})</span>
                ) : null}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
