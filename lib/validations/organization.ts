import { z } from "zod";

const RESERVED_SLUGS = ["admin", "api", "dashboard", "login", "signup", "settings", "org", "booking", "new"];

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens")
    .refine((s) => !RESERVED_SLUGS.includes(s), "This slug is reserved"),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .refine((s) => !RESERVED_SLUGS.includes(s))
    .optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationFormData = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;
