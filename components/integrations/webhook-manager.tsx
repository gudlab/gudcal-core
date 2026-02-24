"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Webhook, WebhookEvent } from "@/app/generated/prisma/client";

import { createWebhook, deleteWebhook, toggleWebhook } from "@/actions/webhooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Icons } from "@/components/shared/icons";

const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "BOOKING_CREATED", label: "Booking Created" },
  { value: "BOOKING_CONFIRMED", label: "Booking Confirmed" },
  { value: "BOOKING_CANCELLED", label: "Booking Cancelled" },
  { value: "BOOKING_RESCHEDULED", label: "Booking Rescheduled" },
  { value: "BOOKING_REMINDER", label: "Booking Reminder" },
  { value: "MEETING_ENDED", label: "Meeting Ended" },
];

interface WebhookManagerProps {
  webhooks: Webhook[];
}

export function WebhookManager({ webhooks }: WebhookManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([
    "BOOKING_CREATED",
    "BOOKING_CANCELLED",
  ]);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const toggleEvent = (event: WebhookEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event],
    );
  };

  const handleCreate = () => {
    if (!url || selectedEvents.length === 0) return;
    startTransition(async () => {
      const result = await createWebhook({ url, events: selectedEvents as any });
      if (result.status === "success") {
        setNewSecret(result.secret ?? null);
        setUrl("");
        toast.success("Webhook created");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = (webhookId: string) => {
    if (!confirm("Delete this webhook?")) return;
    startTransition(async () => {
      const result = await deleteWebhook(webhookId);
      if (result.status === "success") {
        toast.success("Webhook deleted");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleToggle = (webhookId: string) => {
    startTransition(async () => {
      const result = await toggleWebhook(webhookId);
      if (result.status === "success") {
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* New secret reveal */}
      {newSecret && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Webhook secret — save it now, it won&apos;t be shown again:
            </p>
            <code className="block rounded bg-white dark:bg-black p-2 text-xs font-mono break-all">
              {newSecret}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => setNewSecret(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create webhook */}
      <Card>
        <CardHeader>
          <CardTitle>Add Webhook</CardTitle>
          <CardDescription>
            Receive HTTP notifications when events occur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Endpoint URL</Label>
            <Input
              placeholder="https://your-server.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Events</Label>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <button
                  key={event.value}
                  onClick={() => toggleEvent(event.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedEvents.includes(event.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {event.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={isPending || !url || selectedEvents.length === 0}
          >
            {isPending ? (
              <Icons.spinner className="mr-2 size-4 animate-spin" />
            ) : null}
            Create Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Existing webhooks */}
      {webhooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1 flex-1 mr-4">
                    <p className="text-sm font-mono truncate">{webhook.url}</p>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                        >
                          {event.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhook.isActive}
                      onCheckedChange={() => handleToggle(webhook.id)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(webhook.id)}
                    >
                      <Icons.close className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
