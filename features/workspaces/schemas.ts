import { z } from "zod";

import { slugifyName } from "./lib/slug";

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug must be at least 2 characters")
  .max(100)
  .refine((value) => slugifyName(value) === slugifyName(value) && slugifyName(value).length >= 2, {
    message: "Slug must contain letters or numbers",
  })
  .transform((value) => slugifyName(value));

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional(),
  slug: slugSchema.optional(),
  teamId: z.string().uuid("Select a valid team").optional().nullable(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  slug: slugSchema.optional(),
  teamId: z.string().uuid("Select a valid team").nullable().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
