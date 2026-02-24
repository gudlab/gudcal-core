import { EventLocationKind } from "@/app/generated/prisma/client";
import { z } from "zod";

export const eventTypeSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  description: z.string().max(2000).optional().nullable(),
  duration: z.number().int().min(5, "Min 5 minutes").max(720, "Max 12 hours"),
  locationType: z.nativeEnum(EventLocationKind),
  locationValue: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color"),
  bufferBefore: z.number().int().min(0).max(120),
  bufferAfter: z.number().int().min(0).max(120),
  maxBookingsPerDay: z.number().int().min(1).optional().nullable(),
  minimumNotice: z.number().int().min(0),
  requiresConfirmation: z.boolean(),
  isActive: z.boolean().optional(),
  availabilityId: z.string().optional().nullable(),
  customQuestions: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["text", "textarea", "select", "checkbox"]),
        label: z.string().min(1),
        required: z.boolean(),
        options: z.array(z.string()).optional(),
      }),
    )
    .optional()
    .nullable(),
});

export type EventTypeFormData = z.infer<typeof eventTypeSchema>;

/** Default values for a new event type */
export const defaultEventTypeValues: EventTypeFormData = {
  title: "",
  slug: "",
  description: "",
  duration: 30,
  locationType: EventLocationKind.GOOGLE_MEET,
  locationValue: "",
  color: "#0069FF",
  bufferBefore: 0,
  bufferAfter: 0,
  maxBookingsPerDay: null,
  minimumNotice: 120,
  requiresConfirmation: false,
  isActive: true,
  availabilityId: null,
  customQuestions: null,
};
