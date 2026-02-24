import { UserRole } from "@/app/generated/prisma/client";
import * as z from "zod";

import { usernameSchema } from "@/lib/validations/onboarding";

export const userNameSchema = z.object({
  name: z.string().min(3).max(32),
});

export const userRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const userUsernameSchema = z.object({
  username: usernameSchema,
});

export const userBioSchema = z.object({
  bio: z.string().max(500, "Bio must be at most 500 characters"),
});

export const userTimezoneSchema = z.object({
  timezone: z.string().min(1, "Please select a timezone"),
});
