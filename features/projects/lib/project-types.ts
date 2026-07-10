import type { ProjectType } from "@prisma/client";

export const PROJECT_TYPES = [
  "MA",
  "VENDOR_DD",
  "AUDIT",
  "INVESTMENT",
  "INTERNAL",
] as const satisfies readonly ProjectType[];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  MA: "M&A",
  VENDOR_DD: "Vendor DD",
  AUDIT: "Audit",
  INVESTMENT: "Investment",
  INTERNAL: "Internal",
};

export function getProjectTypeLabel(type: ProjectType): string {
  return PROJECT_TYPE_LABELS[type];
}
