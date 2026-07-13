import type { AgentType, FindingSeverity } from "@prisma/client";

import { createNotification } from "@/features/organizations/lib/notifications";
import { AGENT_TYPE_LABELS } from "@/lib/ai/agents/types";

const RISK_SEVERITIES = new Set<FindingSeverity>(["CRITICAL", "HIGH"]);

export async function notifyAgentRunCompleted(input: {
  userId: string;
  projectId: string;
  agentType: AgentType;
  runId: string;
  findings: Array<{ severity: FindingSeverity | null; title: string }>;
}) {
  const intelligenceLink = `/dashboard/projects/${input.projectId}/intelligence?run=${input.runId}`;
  const label = AGENT_TYPE_LABELS[input.agentType];

  await createNotification({
    userId: input.userId,
    type: "SYSTEM",
    title: `${label} scan completed`,
    body: "Review the latest score, breakdown, and cited findings.",
    link: intelligenceLink,
  }).catch(() => undefined);

  const flagged = input.findings.filter(
    (finding) => finding.severity && RISK_SEVERITIES.has(finding.severity),
  );

  if (flagged.length === 0) return;

  const preview = flagged[0]?.title ?? "High-severity finding";
  const suffix = flagged.length > 1 ? ` (+${flagged.length - 1} more)` : "";

  await createNotification({
    userId: input.userId,
    type: "RISK_FOUND",
    title: `${label} scan flagged risks`,
    body: `${preview}${suffix}`,
    link: intelligenceLink,
  }).catch(() => undefined);
}
