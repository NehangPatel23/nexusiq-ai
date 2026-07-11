import type { DocumentClassification } from "@prisma/client";

export const DOCUMENT_CLASSIFICATIONS = [
  "FINANCIAL",
  "LEGAL",
  "TAX",
  "HR",
  "OPERATIONAL",
  "COMPLIANCE",
  "CONTRACT",
  "CORRESPONDENCE",
  "OTHER",
] as const satisfies readonly DocumentClassification[];

export const CLASSIFICATION_LABELS: Record<DocumentClassification, string> = {
  FINANCIAL: "Financial",
  LEGAL: "Legal",
  TAX: "Tax",
  HR: "HR",
  OPERATIONAL: "Operational",
  COMPLIANCE: "Compliance",
  CONTRACT: "Contract",
  CORRESPONDENCE: "Correspondence",
  OTHER: "Other",
};

export function getClassificationLabel(value: DocumentClassification | string | null) {
  if (!value) return null;
  return CLASSIFICATION_LABELS[value as DocumentClassification] ?? value;
}
