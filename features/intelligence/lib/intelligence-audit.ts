import type { AgentRunStatus, AgentType } from "@prisma/client";

import { logDataRoomAudit } from "@/features/data-room/lib/audit";
import { prisma } from "@/lib/db";

const AGENT_LABELS: Record<AgentType, string> = {
  FINANCIAL: "Financial",
  LEGAL: "Legal",
  COMPLIANCE: "Compliance",
  RISK: "Risk",
  FRAUD: "Fraud",
};

export async function logAgentRunAudit(input: {
  projectId: string;
  actorId?: string | null;
  agentType: AgentType;
  runId: string;
  status: AgentRunStatus;
  score?: number | null;
  findingCount?: number;
}) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { name: true },
  });

  const action =
    input.status === "COMPLETED"
      ? ("AGENT_RUN_COMPLETED" as const)
      : input.status === "FAILED"
        ? ("AGENT_RUN_FAILED" as const)
        : null;

  if (!action) return null;

  const label = AGENT_LABELS[input.agentType];
  const scoreText =
    input.score !== null && input.score !== undefined ? ` · score ${Math.round(input.score)}` : "";

  return logDataRoomAudit({
    projectId: input.projectId,
    actorId: input.actorId ?? null,
    action,
    resourceType: "PROJECT",
    resourceId: input.runId,
    resourceName: `${label} agent run`,
    metadata: {
      agentType: input.agentType,
      runId: input.runId,
      status: input.status,
      score: input.score ?? null,
      findingCount: input.findingCount ?? 0,
      summary: `${label} scan ${input.status.toLowerCase()}${scoreText}`,
    },
  });
}
