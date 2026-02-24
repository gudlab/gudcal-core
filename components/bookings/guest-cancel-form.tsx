"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cancelBookingAsGuest } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";

interface GuestCancelFormProps {
  bookingUid: string;
}

export function GuestCancelForm({ bookingUid }: GuestCancelFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [cancelled, setCancelled] = useState(false);

  const handleCancel = () => {
    if (!email) {
      toast.error("Please enter your email address to confirm cancellation.");
      return;
    }

    startTransition(async () => {
      const result = await cancelBookingAsGuest(bookingUid, email, reason || undefined);
      if (result.status === "success") {
        setCancelled(true);
      } else {
        toast.error(result.message);
      }
    });
  };

  if (cancelled) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Icons.check className="size-6 text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Booking Cancelled</h2>
        <p className="text-muted-foreground">
          Your booking has been cancelled. A confirmation email will be sent shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Your email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter the email used to book"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">Reason for cancellation (optional)</Label>
        <Textarea
          id="reason"
          placeholder="Let us know why you're cancelling..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleCancel}
          disabled={isPending || !email}
        >
          {isPending ? (
            <Icons.spinner className="mr-2 size-4 animate-spin" />
          ) : null}
          Cancel Booking
        </Button>
      </div>
    </div>
  );
}
