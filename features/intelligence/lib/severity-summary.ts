import type { FindingSeverity, RiskStatus } from "@prisma/client";

export type FindingSeverityCounts = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export const EMPTY_SEVERITY_COUNTS: FindingSeverityCounts = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
};

type SeverityCountable = {
  severity: FindingSeverity | null;
  status?: RiskStatus;
};

/**
 * Aggregate open findings by severity across a set of agent-run details.
 * Findings carrying an explicit non-OPEN status (e.g. superseded, resolved)
 * are excluded so the total mirrors the current state shown per agent tab.
 */
export function aggregateOpenFindingsBySeverity(
  groups: Iterable<{ findings: SeverityCountable[] } | null | undefined>,
): FindingSeverityCounts {
  const counts = { ...EMPTY_SEVERITY_COUNTS };

  for (const group of groups) {
    if (!group) continue;
    for (const finding of group.findings) {
      if (finding.status && finding.status !== "OPEN") continue;
      switch (finding.severity) {
        case "CRITICAL":
          counts.critical += 1;
          break;
        case "HIGH":
          counts.high += 1;
          break;
        case "MEDIUM":
          counts.medium += 1;
          break;
        case "LOW":
          counts.low += 1;
          break;
        default:
          break;
      }
    }
  }

  return counts;
}

export function totalFindingCount(counts: FindingSeverityCounts): number {
  return counts.critical + counts.high + counts.medium + counts.low;
}
