"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { disconnectCalendar } from "@/actions/integrations";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface DisconnectCalendarButtonProps {
  provider: "GOOGLE" | "OUTLOOK";
}

export function DisconnectCalendarButton({ provider }: DisconnectCalendarButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await disconnectCalendar(provider);
      if (result.status === "success") {
        toast.success("Calendar disconnected");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDisconnect}
      disabled={isPending}
    >
      {isPending ? (
        <Icons.spinner className="mr-2 size-4 animate-spin" />
      ) : null}
      Disconnect
    </Button>
  );
}
