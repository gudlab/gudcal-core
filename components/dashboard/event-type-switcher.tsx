"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { getUserEventTypes } from "@/actions/event-types";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type EventTypeItem = {
  id: string;
  title: string;
  slug: string;
  color: string;
  isActive: boolean;
};

export default function EventTypeSwitcher({
  large = false,
}: {
  large?: boolean;
}) {
  const pathname = usePathname();
  const [openPopover, setOpenPopover] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventTypeItem[]>([]);
  const [isLoading, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getUserEventTypes();
      setEventTypes(data);
    });
  }, [pathname]);

  // Determine currently selected event type from URL
  const selectedId = pathname.match(
    /\/dashboard\/event-types\/([^/]+)/,
  )?.[1];
  const selected = eventTypes.find((et) => et.id === selectedId);

  if (isLoading && eventTypes.length === 0) {
    return <EventTypeSwitcherPlaceholder />;
  }

  return (
    <div>
      <Popover open={openPopover} onOpenChange={setOpenPopover}>
        <PopoverTrigger asChild>
          <Button
            className="h-8 px-2"
            variant={openPopover ? "secondary" : "ghost"}
            onClick={() => setOpenPopover(!openPopover)}
          >
            <div className="flex items-center space-x-3 pr-2">
              <div
                className="size-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: selected?.color ?? "#0069FF",
                }}
              />
              <span
                className={cn(
                  "inline-block truncate text-sm font-medium xl:max-w-[120px]",
                  large ? "w-full" : "max-w-[80px]",
                )}
              >
                {selected?.title ?? "Event Types"}
              </span>
            </div>
            <ChevronsUpDown
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-w-60 p-2">
          <EventTypeList
            eventTypes={eventTypes}
            selectedId={selectedId}
            setOpenPopover={setOpenPopover}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function EventTypeList({
  eventTypes,
  selectedId,
  setOpenPopover,
}: {
  eventTypes: EventTypeItem[];
  selectedId: string | undefined;
  setOpenPopover: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {eventTypes.length === 0 && (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          No event types yet
        </p>
      )}
      {eventTypes.map((et) => (
        <Link
          key={et.id}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "relative flex h-9 items-center gap-3 p-3 text-muted-foreground hover:text-foreground",
          )}
          href={`/dashboard/event-types/${et.id}`}
          onClick={() => setOpenPopover(false)}
        >
          <div
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: et.color }}
          />
          <span
            className={cn(
              "flex-1 truncate text-sm",
              selectedId === et.id
                ? "font-medium text-foreground"
                : "font-normal",
              !et.isActive && "opacity-50",
            )}
          >
            {et.title}
          </span>
          {selectedId === et.id && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-foreground">
              <Check size={18} aria-hidden="true" />
            </span>
          )}
        </Link>
      ))}
      <Link
        href="/dashboard/event-types/new"
        onClick={() => setOpenPopover(false)}
      >
        <Button
          variant="outline"
          className="relative flex h-9 w-full items-center justify-center gap-2 p-2"
        >
          <Plus size={18} className="absolute left-2.5 top-2" />
          <span className="flex-1 truncate text-center">
            New Event Type
          </span>
        </Button>
      </Link>
    </div>
  );
}

function EventTypeSwitcherPlaceholder() {
  return (
    <div className="flex animate-pulse items-center space-x-1.5 rounded-lg px-1.5 py-2 sm:w-60">
      <div className="h-8 w-36 animate-pulse rounded-md bg-muted xl:w-[180px]" />
    </div>
  );
}
