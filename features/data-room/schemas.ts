import { z } from "zod";

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, "Folder name is required").max(120),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateDocumentTagsSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(50)).max(20),
});

export const updateDocumentSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  folderId: z.string().uuid().nullable().optional(),
  classification: z
    .enum([
      "FINANCIAL",
      "LEGAL",
      "TAX",
      "HR",
      "OPERATIONAL",
      "COMPLIANCE",
      "CONTRACT",
      "CORRESPONDENCE",
      "OTHER",
    ])
    .nullable()
    .optional(),
});

export const bulkDocumentIdsSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(100),
});

export const bulkDocumentTagsSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(50)).max(20),
});

export const bulkDocumentClassificationSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(100),
  classification: z.enum([
    "FINANCIAL",
    "LEGAL",
    "TAX",
    "HR",
    "OPERATIONAL",
    "COMPLIANCE",
    "CONTRACT",
    "CORRESPONDENCE",
    "OTHER",
  ]),
});

export const listDocumentsQuerySchema = z.object({
  folderId: z
    .union([z.string().uuid(), z.literal("root"), z.literal("all")])
    .optional()
    .default("all"),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type UpdateDocumentTagsInput = z.infer<typeof updateDocumentTagsSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type BulkDocumentIdsInput = z.infer<typeof bulkDocumentIdsSchema>;
