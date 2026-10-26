"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { toast } from "sonner";

import { deleteTimeOff } from "@/actions/time-off";
import {
  BlockTimeDialog,
  type BlockTimeDraft,
} from "@/components/dashboard/block-time-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { TIME_OFF_LABEL_COPY, type TimeOffLabel } from "@/lib/time-off";

export type TimeOffListItem = {
  id: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  reason: string | null;
  label: TimeOffLabel;
};

function formatRange(item: TimeOffListItem, timezone: string) {
  const start = toZonedTime(new Date(item.startAt), timezone);
  const end = toZonedTime(new Date(item.endAt), timezone);
  if (item.allDay) {
    const sameDay = format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd");
    if (sameDay) return format(start, "EEE, MMM d, yyyy");
    return `${format(start, "MMM d, yyyy")} to ${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "EEE, MMM d, yyyy h:mm a")} to ${format(end, "h:mm a")}`;
}

interface TimeOffListProps {
  timeOffs: TimeOffListItem[];
  timezone: string;
}

export function TimeOffList({ timeOffs, timezone }: TimeOffListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<BlockTimeDraft | null>(null);
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setDraft({
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      allDay: true,
    });
    setOpen(true);
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteTimeOff(id);
      setDeletingId(null);
      if (result.status === "success") {
        toast.success("Time off removed");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Time off</CardTitle>
          <CardDescription>
            Blocks apply to every schedule. Guests cannot book these times.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Icons.add className="mr-2 size-4" />
          Add time off
        </Button>
      </CardHeader>
      <CardContent>
        {timeOffs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No time off yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {timeOffs.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {TIME_OFF_LABEL_COPY[item.label]}
                    {item.allDay ? " · All day" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatRange(item, timezone)}
                  </p>
                  {item.reason ? (
                    <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={isPending && deletingId === item.id}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <BlockTimeDialog
        open={open}
        onOpenChange={setOpen}
        draft={draft}
        timezone={timezone}
      />
    </Card>
  );
}
