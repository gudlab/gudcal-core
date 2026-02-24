"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import type { Booking, EventType, BookingStatus } from "@/app/generated/prisma/client";
import { toast } from "sonner";

import { cancelBooking, confirmBooking } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

type BookingWithEventType = Booking & {
  eventType: Pick<EventType, "title" | "duration" | "color" | "locationType">;
};

interface BookingCardProps {
  booking: BookingWithEventType;
  showActions?: boolean;
}

const statusColors: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  RESCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  NO_SHOW: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export function BookingCard({ booking, showActions = false }: BookingCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    startTransition(async () => {
      const result = await cancelBooking(booking.id);
      if (result.status === "success") {
        toast.success("Booking cancelled");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await confirmBooking(booking.id);
      if (result.status === "success") {
        toast.success("Booking confirmed");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div
              className="mt-1 h-12 w-1 rounded-full"
              style={{ backgroundColor: booking.eventType.color }}
            />
            <div className="space-y-1">
              <h3 className="font-medium">{booking.eventType.title}</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(booking.startTime), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(booking.startTime), "h:mm a")} –{" "}
                {format(new Date(booking.endTime), "h:mm a")}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">with</span>
                <span className="font-medium">{booking.guestName}</span>
                <span className="text-muted-foreground">({booking.guestEmail})</span>
              </div>
              {booking.notes && (
                <p className="text-sm text-muted-foreground italic">
                  &quot;{booking.notes}&quot;
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status]}`}
            >
              {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
            </span>

            {showActions && (
              <div className="flex gap-2">
                {booking.status === "PENDING" && (
                  <Button
                    size="sm"
                    onClick={handleConfirm}
                    disabled={isPending}
                  >
                    Confirm
                  </Button>
                )}
                {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/bookings/${booking.id}/reschedule`}>
                      Reschedule
                    </Link>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
