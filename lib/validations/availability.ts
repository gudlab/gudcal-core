import { z } from "zod";

export const availabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
});

export const dateOverrideSchema = z.object({
  date: z.string(), // ISO date string YYYY-MM-DD
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  isBlocked: z.boolean(),
});

export const availabilitySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  timezone: z.string().min(1, "Timezone is required"),
  rules: z.array(availabilityRuleSchema),
});

export const updateAvailabilitySchema = availabilitySchema.extend({
  dateOverrides: z.array(dateOverrideSchema).optional(),
});

export type AvailabilityFormData = z.infer<typeof availabilitySchema>;
export type UpdateAvailabilityFormData = z.infer<typeof updateAvailabilitySchema>;
export type DateOverrideFormData = z.infer<typeof dateOverrideSchema>;
