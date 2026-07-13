import type { AgentType } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function failStaleRunningAgentRuns(
  projectId: string,
  agentType: AgentType,
  reason = "Superseded by a new agent run.",
) {
  return prisma.agentRun.updateMany({
    where: { projectId, agentType, status: "RUNNING" },
    data: {
      status: "FAILED",
      error: reason,
      completedAt: new Date(),
    },
  });
}
