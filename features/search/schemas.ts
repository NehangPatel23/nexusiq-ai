import { z } from "zod";

const documentTypeEnum = z.enum([
  "PDF",
  "DOCX",
  "XLSX",
  "CSV",
  "PPTX",
  "TXT",
  "MD",
  "IMAGE",
  "OTHER",
]);

const classificationEnum = z.enum([
  "FINANCIAL",
  "LEGAL",
  "TAX",
  "HR",
  "OPERATIONAL",
  "COMPLIANCE",
  "CONTRACT",
  "CORRESPONDENCE",
  "OTHER",
]);

export const searchModeSchema = z.enum(["hybrid", "semantic", "keyword"]);

export const searchFiltersSchema = z
  .object({
    type: documentTypeEnum.optional(),
    classification: classificationEnum.optional(),
    folderId: z.string().uuid().optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  })
  .optional()
  .default({});

export const searchRequestSchema = z.object({
  query: z.string().trim().min(1, "Search query is required").max(500),
  mode: searchModeSchema.optional().default("hybrid"),
  filters: searchFiltersSchema,
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export const createSavedSearchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  query: z.string().trim().min(1, "Query is required").max(500),
  filters: searchFiltersSchema,
  mode: searchModeSchema.optional().default("hybrid"),
});

export type SearchRequestInput = z.infer<typeof searchRequestSchema>;
export type CreateSavedSearchInput = z.infer<typeof createSavedSearchSchema>;
