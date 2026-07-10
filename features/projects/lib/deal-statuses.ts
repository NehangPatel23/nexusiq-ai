export const COMMON_DEAL_STATUSES = [
  "In diligence",
  "Negotiation",
  "On hold",
  "Closed",
  "Passed",
] as const;

export type DealStatusFilter = "ALL" | "NONE" | string;

export function collectDealStatusOptions(projects: { dealStatus: string | null }[]) {
  const unique = new Set<string>(COMMON_DEAL_STATUSES);

  for (const project of projects) {
    if (project.dealStatus?.trim()) {
      unique.add(project.dealStatus.trim());
    }
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}
