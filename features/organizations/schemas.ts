import { z } from "zod";

const orgRoleSchema = z.enum(["OWNER", "ADMIN", "ANALYST", "REVIEWER", "VIEWER"]);

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  role: orgRoleSchema.refine((role) => role !== "OWNER", {
    message: "Cannot invite users as Owner",
  }),
});

export const updateMemberRoleSchema = z.object({
  role: orgRoleSchema,
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
