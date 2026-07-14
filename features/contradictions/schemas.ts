import { z } from "zod";

export const contradictionFactTypeSchema = z.enum([
  "DATE",
  "AMOUNT",
  "PARTY",
  "METRIC",
  "OTHER",
]);

export const contradictionSeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const contradictionStatusSchema = z.enum([
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "DISMISSED",
]);

export const extractedContradictionSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  factType: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(contradictionFactTypeSchema),
  valueA: z.string().trim().min(1).max(500),
  valueB: z.string().trim().min(1).max(500),
  documentAId: z.string().uuid(),
  chunkAId: z.string().uuid(),
  documentBId: z.string().uuid(),
  chunkBId: z.string().uuid(),
  explanation: z.string().trim().min(1).max(4000),
  severity: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(contradictionSeveritySchema),
});

export const extractedContradictionPayloadSchema = z.union([
  z.array(extractedContradictionSchema),
  z.object({ contradictions: z.array(extractedContradictionSchema) }),
]);

export type ExtractedContradiction = z.infer<typeof extractedContradictionSchema>;

export const scanContradictionsBodySchema = z.object({
  force: z.boolean().optional(),
});

export const updateContradictionStatusBodySchema = z
  .object({
    status: contradictionStatusSchema.optional(),
    severity: contradictionSeveritySchema.optional(),
    resolutionNote: z.string().trim().max(4000).nullable().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.severity !== undefined ||
      data.resolutionNote !== undefined,
    {
      message: "Provide status, severity, and/or resolutionNote",
    },
  );

export const bulkUpdateContradictionStatusBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  status: contradictionStatusSchema,
  resolutionNote: z.string().trim().max(4000).nullable().optional(),
});

export const listContradictionsQuerySchema = z.object({
  status: contradictionStatusSchema.optional(),
  severity: contradictionSeveritySchema.optional(),
  factType: contradictionFactTypeSchema.optional(),
});
