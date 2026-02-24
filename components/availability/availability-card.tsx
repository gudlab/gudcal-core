"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { type Availability } from "@/app/generated/prisma/client";
import { toast } from "sonner";

import {
  deleteAvailability,
  setDefaultAvailability,
} from "@/actions/availability";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { Icons } from "@/components/shared/icons";

interface AvailabilityCardProps {
  availability: Availability;
  summary: string;
  eventTypeCount: number;
}

export function AvailabilityCard({
  availability,
  summary,
  eventTypeCount,
}: AvailabilityCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSetDefault = () => {
    startTransition(async () => {
      const result = await setDefaultAvailability(availability.id);
      if (result.status === "success") {
        toast.success("Default schedule updated");
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteAvailability(availability.id);
      if (result.status === "success") {
        toast.success("Schedule deleted");
        setShowDeleteDialog(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/availability/${availability.id}`}
            className="font-semibold hover:underline"
          >
            {availability.name}
          </Link>
          {availability.isDefault && <Badge>Default</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{summary}</p>
        <p className="text-xs text-muted-foreground">
          {availability.timezone}
          {eventTypeCount > 0 && (
            <>
              {" "}
              &middot; {eventTypeCount} event type
              {eventTypeCount !== 1 ? "s" : ""}
            </>
          )}
        </p>
      </div>

      <Button variant="outline" size="sm" asChild>
        <Link href={`/dashboard/availability/${availability.id}`}>
          <Icons.settings className="mr-2 size-3.5" />
          Edit
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <Icons.ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/availability/${availability.id}`}>
              Edit
            </Link>
          </DropdownMenuItem>
          {!availability.isDefault && (
            <DropdownMenuItem onClick={handleSetDefault}>
              Set as default
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the &quot;{availability.name}&quot;
              schedule. Event types using this schedule will need to be
              reassigned.
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
