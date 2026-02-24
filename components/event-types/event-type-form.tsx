"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { EventLocationKind, type EventType } from "@/app/generated/prisma/client";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createEventType, updateEventType } from "@/actions/event-types";
import {
  eventTypeSchema,
  defaultEventTypeValues,
  type EventTypeFormData,
} from "@/lib/validations/event-type";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/shared/icons";

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

const LOCATION_OPTIONS = [
  { value: EventLocationKind.GOOGLE_MEET, label: "Google Meet" },
  { value: EventLocationKind.ZOOM, label: "Zoom" },
  { value: EventLocationKind.PHONE, label: "Phone Call" },
  { value: EventLocationKind.IN_PERSON, label: "In Person" },
  { value: EventLocationKind.CUSTOM, label: "Custom" },
];

const BUFFER_OPTIONS = [
  { value: 0, label: "No buffer" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
];

interface EventTypeFormProps {
  eventType?: EventType;
}

export function EventTypeForm({ eventType }: EventTypeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!eventType;

  const form = useForm<EventTypeFormData>({
    resolver: zodResolver(eventTypeSchema),
    defaultValues: eventType
      ? {
          title: eventType.title,
          slug: eventType.slug,
          description: eventType.description ?? "",
          duration: eventType.duration,
          locationType: eventType.locationType,
          locationValue: eventType.locationValue ?? "",
          color: eventType.color,
          bufferBefore: eventType.bufferBefore,
          bufferAfter: eventType.bufferAfter,
          maxBookingsPerDay: eventType.maxBookingsPerDay,
          minimumNotice: eventType.minimumNotice,
          requiresConfirmation: eventType.requiresConfirmation,
          isActive: eventType.isActive,
          availabilityId: eventType.availabilityId,
          customQuestions: eventType.customQuestions as any,
        }
      : defaultEventTypeValues,
  });

  // Auto-generate slug from title (only when creating)
  const title = form.watch("title");
  useEffect(() => {
    if (!isEditing && title) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 100);
      form.setValue("slug", slug);
    }
  }, [title, isEditing, form]);

  const onSubmit = (data: EventTypeFormData) => {
    startTransition(async () => {
      const result = isEditing
        ? await updateEventType(eventType.id, data)
        : await createEventType(data);

      if (result.status === "success") {
        toast.success(
          isEditing ? "Event type updated" : "Event type created",
        );
        router.push("/dashboard/event-types");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>
              Basic information about your event type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Quick Chat"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  gudcal.com/you/
                </span>
                <Input
                  id="slug"
                  placeholder="quick-chat"
                  {...form.register("slug")}
                />
              </div>
              {form.formState.errors.slug && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.slug.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="A brief description of this meeting type..."
                {...form.register("description")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={form.watch("duration").toString()}
                  onValueChange={(v) =>
                    form.setValue("duration", parseInt(v))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value.toString()}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={form.watch("locationType")}
                  onValueChange={(v) =>
                    form.setValue(
                      "locationType",
                      v as EventLocationKind,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="color"
                  value={form.watch("color")}
                  onChange={(e) => form.setValue("color", e.target.value)}
                  className="size-10 cursor-pointer rounded border"
                />
                <Input
                  value={form.watch("color")}
                  onChange={(e) => form.setValue("color", e.target.value)}
                  className="w-28"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Buffer before</Label>
                <Select
                  value={form.watch("bufferBefore").toString()}
                  onValueChange={(v) =>
                    form.setValue("bufferBefore", parseInt(v))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUFFER_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value.toString()}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Buffer after</Label>
                <Select
                  value={form.watch("bufferAfter").toString()}
                  onValueChange={(v) =>
                    form.setValue("bufferAfter", parseInt(v))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUFFER_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value.toString()}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Requires confirmation</p>
                <p className="text-sm text-muted-foreground">
                  Bookings need your approval before being confirmed
                </p>
              </div>
              <Switch
                checked={form.watch("requiresConfirmation")}
                onCheckedChange={(v) =>
                  form.setValue("requiresConfirmation", v)
                }
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Icons.spinner className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Event Type"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}
