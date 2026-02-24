"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { BookingWidget } from "@/components/booking/booking-widget";

interface GuestRescheduleFormProps {
  bookingUid: string;
  guestEmail: string;
  eventType: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    duration: number;
    color: string;
    locationType: string;
    locationValue: string | null;
    customQuestions:
      | { id: string; type: string; label: string; required: boolean; options?: string[] }[]
      | null;
  };
  user: {
    name: string | null;
    username: string;
    image: string | null;
    bio: string | null;
    timezone: string;
  };
  prefillGuest: {
    name: string;
    email: string;
    timezone: string;
    notes?: string;
  };
}

export function GuestRescheduleForm({
  bookingUid,
  guestEmail,
  eventType,
  user,
  prefillGuest,
}: GuestRescheduleFormProps) {
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    if (email.toLowerCase() !== guestEmail.toLowerCase()) {
      toast.error("Email does not match the booking.");
      return;
    }
    setVerified(true);
  };

  if (!verified) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            To reschedule this booking, please verify your email address.
          </p>
          <div className="space-y-2">
            <Label htmlFor="email">Your email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter the email used to book"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              required
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
            <Button className="flex-1" onClick={handleVerify} disabled={!email}>
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <BookingWidget
      eventType={eventType}
      user={user}
      rescheduleUid={bookingUid}
      prefillGuest={prefillGuest}
    />
  );
}
