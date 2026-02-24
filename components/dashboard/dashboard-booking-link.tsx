"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface DashboardBookingLinkProps {
  username: string;
}

export function DashboardBookingLink({ username }: DashboardBookingLinkProps) {
  const [copied, setCopied] = useState(false);
  const bookingUrl = `gudcal.com/${username}`;
  const fullUrl = `https://gudcal.com/${username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleCopy}
    >
      {copied ? (
        <Icons.check className="size-3.5 text-green-500" />
      ) : (
        <Icons.copy className="size-3.5" />
      )}
      <span className="text-muted-foreground">{bookingUrl}</span>
    </Button>
  );
}
