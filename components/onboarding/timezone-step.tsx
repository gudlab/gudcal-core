"use client";

import { useMemo, useState } from "react";

import { getGroupedTimezones } from "@/config/timezones";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/shared/icons";

interface TimezoneStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TimezoneStep({
  value,
  onChange,
  onNext,
  onBack,
}: TimezoneStepProps) {
  const [search, setSearch] = useState("");
  const groups = useMemo(() => getGroupedTimezones(), []);

  const filteredGroups = useMemo(() => {
    if (!search) return groups;

    const query = search.toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter(
          (opt) =>
            opt.value.toLowerCase().includes(query) ||
            opt.label.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set your timezone</CardTitle>
        <CardDescription>
          We auto-detected your timezone. Change it if needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tz-search">Search timezones</Label>
          <Input
            id="tz-search"
            placeholder="Search by city or region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="h-64 rounded-md border">
          <div className="p-2">
            {filteredGroups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="mb-1 px-2 text-xs font-semibold uppercase text-muted-foreground">
                  {group.label}
                </p>
                {group.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                      value === option.value
                        ? "bg-primary/10 font-medium text-primary"
                        : ""
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.offset}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No timezones found
              </p>
            )}
          </div>
        </ScrollArea>

        {value && (
          <p className="text-sm">
            Selected:{" "}
            <span className="font-medium">{value.replace(/_/g, " ")}</span>
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <Icons.chevronLeft className="mr-2 size-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!value}>
          Continue
          <Icons.arrowRight className="ml-2 size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
