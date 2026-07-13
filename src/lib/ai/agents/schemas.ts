import { z } from "zod";

const SEVERITY_BY_RANK: Record<number, "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"> = {
  1: "CRITICAL",
  2: "HIGH",
  3: "MEDIUM",
  4: "LOW",
};

function normalizeSeverity(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rank = Math.round(value);
    if (rank in SEVERITY_BY_RANK) return SEVERITY_BY_RANK[rank];
    if (rank <= 0) return "LOW";
    if (rank >= 5) return "CRITICAL";
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return normalizeSeverity(Number(trimmed));
    }
    return trimmed.toUpperCase();
  }
  return value;
}

function normalizeEnumString(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toUpperCase() : value;
}

function normalizeLowerEnumString(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function coerceOptionalString(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return value;
}

function coerceScore(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

const scoreSchema = z.preprocess(coerceScore, z.number().min(0).max(100));

function normalizeConcentration(value: unknown, listKey: string): unknown {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return { [listKey]: value };
  if (typeof value === "object") return value;
  return { summary: value };
}

function normalizeCustomerConcentration(value: unknown): unknown {
  return normalizeConcentration(value, "topCustomers");
}

function normalizeVendorConcentration(value: unknown): unknown {
  return normalizeConcentration(value, "topVendors");
}

function normalizeLooseRecord(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return { items: value };
  if (typeof value === "object") return value;
  return { value };
}

const looseRecordSchema = z.preprocess(normalizeLooseRecord, z.record(z.unknown())).optional();

/**
 * Ollama sometimes emits object arrays as positional tuples. Map each array
 * item onto the provided keys so downstream schemas still validate.
 */
function normalizeObjectArray(keys: string[]) {
  return (value: unknown): unknown => {
    if (!Array.isArray(value)) return value;
    return value.map((item) => {
      if (!Array.isArray(item)) return item;
      const record: Record<string, unknown> = {};
      keys.forEach((key, index) => {
        if (item[index] !== undefined) record[key] = item[index];
      });
      return record;
    });
  };
}

const confidenceSchema = z.preprocess(
  normalizeEnumString,
  z.enum(["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"]),
);
const severitySchema = z.preprocess(
  normalizeSeverity,
  z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
);
const optionalStringSchema = z.preprocess(coerceOptionalString, z.string().optional());

const citedItemSchema = z
  .object({
    title: optionalStringSchema,
    description: optionalStringSchema,
    severity: severitySchema.optional(),
    sourceChunkId: optionalStringSchema,
    documentId: optionalStringSchema,
  })
  .passthrough();

export const financialOutputSchema = z
  .object({
    financialHealthScore: scoreSchema,
    revenueAnalysis: z.string().optional(),
    expenseAnalysis: z.string().optional(),
    cashFlowAnalysis: z.string().optional(),
    marginAnalysis: z.string().optional(),
    anomalies: z.array(citedItemSchema).optional(),
    customerConcentration: z.preprocess(
      normalizeCustomerConcentration,
      z.record(z.unknown()),
    ).optional(),
    vendorConcentration: z.preprocess(
      normalizeVendorConcentration,
      z.record(z.unknown()),
    ).optional(),
    duplicatePayments: z.array(citedItemSchema).optional(),
    invoiceFraudIndicators: z.array(citedItemSchema).optional(),
    forecast: looseRecordSchema,
    varianceAnalysis: z
      .array(
        z
          .object({
            metric: z.string(),
            expected: optionalStringSchema,
            actual: optionalStringSchema,
            sourceChunkId: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    journalEntrySuggestions: z.array(citedItemSchema).optional(),
    recommendation: z.string(),
    confidence: confidenceSchema,
  })
  .passthrough();

export const legalOutputSchema = z
  .object({
    legalRiskScore: scoreSchema,
    contracts: z.array(citedItemSchema.extend({ name: z.preprocess(coerceOptionalString, z.string().default("Contract")) })).optional(),
    clauses: z.record(z.array(citedItemSchema)).optional(),
    redFlags: z
      .array(
        citedItemSchema.extend({
          title: z.preprocess(coerceOptionalString, z.string().default("Legal red flag")),
        }),
      )
      .optional(),
    expiringContracts: z
      .array(
        z
          .object({
            name: z.preprocess(coerceOptionalString, z.string().default("Contract")),
            expiryDate: optionalStringSchema,
            sourceChunkId: optionalStringSchema,
          })
          .passthrough(),
      )
      .optional(),
    litigation: z.array(citedItemSchema).optional(),
    recommendation: z.string(),
    confidence: confidenceSchema,
  })
  .passthrough();

export const complianceOutputSchema = z
  .object({
    auditReadinessScore: scoreSchema,
    frameworkGaps: z
      .array(
        z
          .object({
            framework: z.string(),
            requirement: z.string(),
            status: z.preprocess(
              normalizeLowerEnumString,
              z.enum(["met", "partial", "missing"]),
            ),
            evidence: optionalStringSchema,
            sourceChunkId: z.preprocess(
              (value) => (value === null ? null : coerceOptionalString(value)),
              z.string().nullable().optional(),
            ),
            remediation: optionalStringSchema,
          })
          .passthrough(),
      )
      .optional(),
    policyMappings: z
      .preprocess(
        normalizeObjectArray(["policy", "documentId", "coverage"]),
        z.array(
          z
            .object({
              policy: z.string(),
              documentId: optionalStringSchema,
              coverage: optionalStringSchema,
            })
            .passthrough(),
        ),
      )
      .optional(),
    recommendation: z.string(),
    confidence: confidenceSchema,
  })
  .passthrough();

export const riskOutputSchema = z
  .object({
    enterpriseRiskScore: scoreSchema,
    categoryScores: z.record(z.number()).optional(),
    findings: z
      .array(
        z
          .object({
            category: z.string(),
            title: z.string(),
            description: z.preprocess(coerceOptionalString, z.string().default("")),
            severity: severitySchema,
            sourceChunkId: optionalStringSchema,
            documentId: optionalStringSchema,
          })
          .passthrough(),
      )
      .optional(),
    riskHeatmap: z
      .preprocess(
        normalizeObjectArray(["category", "severity", "count"]),
        z.array(
          z
            .object({
              category: z.string(),
              severity: severitySchema,
              // Ollama often omits count; default rather than failing the whole agent.
              count: z.preprocess((value) => {
                if (value === null || value === undefined || value === "") return 0;
                if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
                  return Number(value);
                }
                return value;
              }, z.number().default(0)),
            })
            .passthrough(),
        ),
      )
      .optional(),
    recommendation: z.string(),
    confidence: confidenceSchema,
  })
  .passthrough();

export const fraudOutputSchema = z
  .object({
    fraudRiskScore: scoreSchema,
    indicators: z
      .array(
        z
          .object({
            type: z.string(),
            title: z.string(),
            description: z.preprocess(coerceOptionalString, z.string().default("")),
            severity: severitySchema,
            sourceChunkId: optionalStringSchema,
            documentId: optionalStringSchema,
          })
          .passthrough(),
      )
      .optional(),
    recommendation: z.string(),
    confidence: confidenceSchema,
  })
  .passthrough();

export const agentOutputSchemas = {
  FINANCIAL: financialOutputSchema,
  LEGAL: legalOutputSchema,
  COMPLIANCE: complianceOutputSchema,
  RISK: riskOutputSchema,
  FRAUD: fraudOutputSchema,
} as const;

export function formatAgentValidationErrors(error: z.ZodError): string {
  const extra = error.issues.length > 12 ? `\n- ...and ${error.issues.length - 12} more` : "";
  const lines = error.issues
    .slice(0, 12)
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `- ${path}: ${issue.message}`;
    })
    .join("\n");
  return `${lines}${extra}`;
}

export function parseAgentJsonResult<T extends keyof typeof agentOutputSchemas>(
  agentType: T,
  raw: string,
):
  | { success: true; data: z.infer<(typeof agentOutputSchemas)[T]> }
  | { success: false; error: z.ZodError } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "Response was not valid JSON",
        },
      ]),
    };
  }

  const result = agentOutputSchemas[agentType].safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function parseAgentJson<T extends keyof typeof agentOutputSchemas>(
  agentType: T,
  raw: string,
): z.infer<(typeof agentOutputSchemas)[T]> {
  const result = parseAgentJsonResult(agentType, raw);
  if (result.success) {
    return result.data;
  }
  throw new Error(formatAgentValidationErrors(result.error));
}

export function extractAgentScore(agentType: keyof typeof agentOutputSchemas, output: Record<string, unknown>) {
  const fieldMap = {
    FINANCIAL: "financialHealthScore",
    LEGAL: "legalRiskScore",
    COMPLIANCE: "auditReadinessScore",
    RISK: "enterpriseRiskScore",
    FRAUD: "fraudRiskScore",
  } as const;
  const field = fieldMap[agentType];
  const value = output[field];
  return typeof value === "number" ? value : null;
}
