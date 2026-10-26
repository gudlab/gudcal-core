import { z } from "zod";

export const TIME_OFF_LABELS = ["HOLIDAY", "SICK", "AWAY", "OTHER"] as const;

export const timeOffSchema = z
  .object({
    startAt: z
      .string()
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid start"),
    endAt: z
      .string()
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid end"),
    allDay: z.boolean(),
    reason: z.string().max(500).optional().nullable(),
    label: z.enum(TIME_OFF_LABELS),
    cancelOverlapping: z.boolean().optional(),
  })
  .refine((data) => Date.parse(data.endAt) > Date.parse(data.startAt), {
    message: "End must be after start",
    path: ["endAt"],
  });

export type TimeOffFormData = z.infer<typeof timeOffSchema>;
