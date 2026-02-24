"use client";

import { useMemo, useState, useTransition } from "react";
import {
  updateTimezone,
  type TimezoneFormData,
} from "@/actions/update-timezone";
import { toast } from "sonner";

import {
  getGroupedTimezones,
  type TimezoneGroup,
} from "@/config/timezones";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionColumns } from "@/components/dashboard/section-columns";
import { Icons } from "@/components/shared/icons";

interface UserTimezoneFormProps {
  user: { id: string; timezone: string };
}

export function UserTimezoneForm({ user }: UserTimezoneFormProps) {
  const [timezone, setTimezone] = useState(user.timezone);
  const [updated, setUpdated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const updateTimezoneWithId = updateTimezone.bind(null, user.id);

  const groups: TimezoneGroup[] = useMemo(() => getGroupedTimezones(), []);

  const handleChange = (value: string) => {
    setTimezone(value);
    setUpdated(value !== user.timezone);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const { status } = await updateTimezoneWithId({ timezone });

      if (status !== "success") {
        toast.error("Something went wrong.", {
          description: "Your timezone was not updated. Please try again.",
        });
      } else {
        setUpdated(false);
        toast.success("Your timezone has been updated.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <SectionColumns
        title="Timezone"
        description="Used to calculate your availability and display booking times."
      >
        <div className="flex w-full items-center gap-2">
          <Label className="sr-only" htmlFor="timezone">
            Timezone
          </Label>
          <Select value={timezone} onValueChange={handleChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {groups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel className="text-xs font-semibold text-muted-foreground">
                    {group.label}
                  </SelectLabel>
                  {group.options.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}{" "}
                      <span className="text-muted-foreground">
                        ({tz.offset})
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="submit"
            variant={updated ? "default" : "disable"}
            disabled={isPending || !updated}
            className="w-[67px] shrink-0 px-0 sm:w-[130px]"
          >
            {isPending ? (
              <Icons.spinner className="size-4 animate-spin" />
            ) : (
              <p>
                Save
                <span className="hidden sm:inline-flex">&nbsp;Changes</span>
              </p>
            )}
          </Button>
        </div>
        <div className="flex flex-col justify-between p-1">
          <p className="text-[13px] text-muted-foreground">
            Also updates your default availability schedule.
          </p>
        </div>
      </SectionColumns>
    </form>
  );
}
