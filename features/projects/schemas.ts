import { z } from "zod";

import { DEFAULT_AGENTS } from "./lib/default-agents";
import { PROJECT_TYPES } from "./lib/project-types";
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

const projectTypeSchema = z.enum(PROJECT_TYPES, {
  errorMap: () => ({ message: "Select a valid project type" }),
});

const defaultAgentSchema = z.enum(DEFAULT_AGENTS);

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional(),
  slug: slugSchema.optional(),
  type: projectTypeSchema,
  targetCompany: z.string().trim().max(200).optional(),
  dealStatus: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  defaultAgent: defaultAgentSchema.optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  slug: slugSchema.optional(),
  type: projectTypeSchema.optional(),
  targetCompany: z.string().trim().max(200).nullable().optional(),
  dealStatus: z.string().trim().max(100).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  defaultAgent: defaultAgentSchema.nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
