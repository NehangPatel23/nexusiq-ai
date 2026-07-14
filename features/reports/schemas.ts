import { z } from "zod";

export const reportTypeSchema = z.enum([
  "EXECUTIVE",
  "BOARD",
  "INVESTMENT_MEMO",
  "AUDIT",
  "RISK_REGISTER",
  "ACTION_PLAN",
  "PPTX",
]);

export const reportFormatSchema = z.enum(["MARKDOWN", "PDF", "XLSX", "PPTX"]);

export const generateReportBodySchema = z.object({
  reportType: reportTypeSchema,
  title: z.string().trim().min(1).max(200).optional(),
  forceRegenerate: z.boolean().optional(),
  formats: z.array(reportFormatSchema).max(4).optional(),
});

export const renameReportBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const duplicateReportBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export const createReportShareBodySchema = z.object({
  label: z.string().trim().max(120).optional().nullable(),
  expiresInDays: z.number().int().min(1).max(365).optional().nullable(),
  format: reportFormatSchema.optional().nullable(),
});

export const compareReportsBodySchema = z.object({
  leftReportId: z.string().min(1),
  rightReportId: z.string().min(1),
});

export const findingSeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const updateFindingStatusBodySchema = z
  .object({
    status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]).optional(),
    severity: findingSeveritySchema.optional(),
  })
  .refine((data) => data.status !== undefined || data.severity !== undefined, {
    message: "Provide status and/or severity",
  });

export const exportFormatQuerySchema = z.enum(["pdf", "md", "xlsx", "pptx", "markdown", "zip"]);

export type ReportTypeInput = z.infer<typeof reportTypeSchema>;
export type ReportFormatInput = z.infer<typeof reportFormatSchema>;

export function reportFormatToExportKey(
  format: z.infer<typeof reportFormatSchema>,
): "md" | "pdf" | "xlsx" | "pptx" {
  switch (format) {
    case "MARKDOWN":
      return "md";
    case "PDF":
      return "pdf";
    case "XLSX":
      return "xlsx";
    case "PPTX":
      return "pptx";
  }
}
