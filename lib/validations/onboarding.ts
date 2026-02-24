import { z } from "zod";

// Reserved words that cannot be used as usernames
const RESERVED_USERNAMES = [
  "api",
  "admin",
  "dashboard",
  "booking",
  "onboarding",
  "login",
  "register",
  "settings",
  "billing",
  "pricing",
  "features",
  "blog",
  "docs",
  "terms",
  "privacy",
  "support",
  "help",
  "about",
  "contact",
  "app",
  "www",
  "mail",
  "ftp",
  "static",
  "assets",
  "public",
  "org",
  "team",
  "new",
  "edit",
  "delete",
  "cancel",
  "reschedule",
  "embed",
  "widget",
  "webhook",
  "cron",
  "mcp",
];

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    "Username must start and end with a letter or number, and can only contain lowercase letters, numbers, and hyphens",
  )
  .refine(
    (val) => !RESERVED_USERNAMES.includes(val),
    "This username is reserved",
  );

export const onboardingSchema = z.object({
  username: usernameSchema,
  timezone: z.string().min(1, "Please select a timezone"),
  schedule: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
      }),
    )
    .min(1, "Please set at least one available day"),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
