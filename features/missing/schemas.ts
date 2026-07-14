import { z } from "zod";

export const missingItemStatusSchema = z.enum([
  "OPEN",
  "REQUESTED",
  "RESOLVED",
  "NOT_APPLICABLE",
]);

export const missingSeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const scanMissingBodySchema = z.object({
  force: z.boolean().optional(),
  polishFollowUps: z.boolean().optional(),
});

export const updateMissingItemStatusBodySchema = z
  .object({
    status: missingItemStatusSchema.optional(),
    severity: missingSeveritySchema.optional().nullable(),
  })
  .refine((data) => data.status !== undefined || data.severity !== undefined, {
    message: "Provide status and/or severity",
  });

export const listMissingQuerySchema = z.object({
  status: missingItemStatusSchema.optional(),
});

export const exportMissingBodySchema = z.object({
  format: z.enum(["markdown", "csv"]).default("markdown"),
  statuses: z
    .array(z.enum(["OPEN", "REQUESTED"]))
    .optional()
    .default(["OPEN", "REQUESTED"]),
});

export const polishedFollowUpSchema = z.object({
  title: z.string().optional(),
  followUpText: z.string().trim().min(1).max(4000),
});

export const polishedFollowUpPayloadSchema = z.union([
  z.array(polishedFollowUpSchema),
  z.object({ items: z.array(polishedFollowUpSchema) }),
]);
