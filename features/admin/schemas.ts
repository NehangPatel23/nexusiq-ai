import { z } from "zod";

export const adminOrgQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
});

export const adminUsageQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  days: z.coerce.number().int().min(7).max(90).optional(),
});

export const adminReindexSchema = z.object({
  mode: z.enum(["fts", "embeddings", "all"]),
  organizationId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  confirm: z.literal(true),
  cursor: z.string().uuid().optional(),
});

export const adminRetryQueueSchema = z.object({
  organizationId: z.string().uuid().optional(),
  documentIds: z.array(z.string().uuid()).max(100).optional(),
  confirm: z.literal(true),
});
