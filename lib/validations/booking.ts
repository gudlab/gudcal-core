import { z } from "zod";

export const createBookingSchema = z.object({
  eventTypeId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  guestName: z.string().min(1, "Name is required").max(100),
  guestEmail: z.string().email("Invalid email address"),
  guestTimezone: z.string(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
