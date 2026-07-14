import type { FindingSeverity, TaskPriority } from "@prisma/client";

export type FindingTaskSource = {
  id: string;
  title: string;
  description: string;
  severity: FindingSeverity | null;
  documentId: string | null;
};

export type SuggestedTaskDraft = {
  title: string;
  description: string;
  priority: TaskPriority;
  impact: string;
  findingId: string | null;
  documentId: string | null;
};

export function severityToTaskPriority(severity: FindingSeverity | null | undefined): TaskPriority {
  switch (severity) {
    case "CRITICAL":
      return "CRITICAL";
    case "HIGH":
      return "URGENT";
    case "MEDIUM":
      return "HIGH";
    case "LOW":
      return "MEDIUM";
    default:
      return "MEDIUM";
  }
}

export function mapFindingToTaskDraft(finding: FindingTaskSource): SuggestedTaskDraft {
  return {
    title: finding.title.trim().slice(0, 300),
    description: finding.description.trim().slice(0, 4000),
    priority: severityToTaskPriority(finding.severity),
    impact: finding.severity
      ? `${finding.severity} severity finding`
      : "Open intelligence finding",
    findingId: finding.id,
    documentId: finding.documentId,
  };
}

export function mapExecutiveActionToTaskDraft(
  action: string,
  index: number,
): SuggestedTaskDraft {
  const title = action.trim().slice(0, 300);
  return {
    title,
    description: "Executive priority action from the latest executive package.",
    priority: index === 0 ? "URGENT" : "HIGH",
    impact: `Executive priority P${index + 1}`,
    findingId: null,
    documentId: null,
  };
}

export function dedupeTaskKey(title: string, findingId: string | null): string {
  return `${title.trim().toLowerCase()}::${findingId ?? ""}`;
}
