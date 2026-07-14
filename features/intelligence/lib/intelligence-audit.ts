import type { AgentRunStatus, AgentType } from "@prisma/client";

import { logDataRoomAudit } from "@/features/data-room/lib/audit";
import { logAuditForProject } from "@/features/history/lib/audit";
import { AGENT_TYPE_LABELS } from "@/lib/ai/agents/types";
import { prisma } from "@/lib/db";

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

  const label = AGENT_TYPE_LABELS[input.agentType];
  const scoreText =
    input.score !== null && input.score !== undefined ? ` · score ${Math.round(input.score)}` : "";

  const metadata = {
    agentType: input.agentType,
    runId: input.runId,
    status: input.status,
    score: input.score ?? null,
    findingCount: input.findingCount ?? 0,
    projectName: project?.name ?? null,
    summary: `${label} scan ${input.status.toLowerCase()}${scoreText}`,
  };

  void logAuditForProject(input.projectId, {
    userId: input.actorId ?? null,
    action: "AGENT_RUN",
    entityType: "AgentRun",
    entityId: input.runId,
    metadata: { ...metadata, projectId: input.projectId },
  });

  return logDataRoomAudit({
    projectId: input.projectId,
    actorId: input.actorId ?? null,
    action,
    resourceType: "PROJECT",
    resourceId: input.runId,
    resourceName: `${label} agent run`,
    metadata,
  });
}
