"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { EventVisibility, type EventType } from "@/app/generated/prisma/client";
import { toast } from "sonner";

import {
  deleteEventType,
  duplicateEventType,
  toggleEventType,
} from "@/actions/event-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Icons } from "@/components/shared/icons";

interface EventTypeCardProps {
  eventType: EventType;
  username: string;
  bookingCount: number;
}

export function EventTypeCard({
  eventType,
  username,
  bookingCount,
}: EventTypeCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const bookingUrl = `${window.location.origin}/${username}/${eventType.slug}`;

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      const result = await toggleEventType(eventType.id, checked);
      if (result.status === "error") {
        toast.error(result.message);
      }
    });
  };

  const handleDuplicate = () => {
    startTransition(async () => {
      const result = await duplicateEventType(eventType.id);
      if (result.status === "success") {
        toast.success("Event type duplicated");
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteEventType(eventType.id);
      if (result.status === "success") {
        toast.success("Event type deleted");
        setShowDeleteDialog(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success("Booking link copied!");
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      {/* Color indicator */}
      <div
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: eventType.color }}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/event-types/${eventType.id}`}
            className="font-semibold hover:underline"
          >
            {eventType.title}
          </Link>
          {!eventType.isActive && (
            <Badge variant="secondary">Inactive</Badge>
          )}
          {eventType.isActive && eventType.visibility === EventVisibility.PRIVATE && (
            <Badge variant="outline">Private</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {eventType.duration} min · /{username}/{eventType.slug}
        </p>
      </div>

      {/* Booking count */}
      <div className="hidden text-sm text-muted-foreground sm:block">
        {bookingCount} booking{bookingCount !== 1 ? "s" : ""}
      </div>

      {/* Toggle */}
      <Switch
        checked={eventType.isActive}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />

      {/* Copy link */}
      <Button variant="outline" size="sm" onClick={handleCopyLink}>
        <Icons.copy className="mr-2 size-3.5" />
        Copy Link
      </Button>

      {/* More actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <Icons.ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/event-types/${eventType.id}`}>
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            Copy booking link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{eventType.title}&quot; and all
              associated bookings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <Icons.spinner className="mr-2 size-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
