import type { AgentType, Prisma } from "@prisma/client";

import type { DashboardActivityItem } from "@/features/projects/lib/dashboard";
import { AGENT_TYPE_LABELS } from "@/lib/ai/agents/types";
import { prisma } from "@/lib/db";

function userProjectsFilter(userId: string): Prisma.ProjectWhereInput {
  return {
    deletedAt: null,
    workspace: {
      deletedAt: null,
      organization: {
        deletedAt: null,
        members: { some: { userId } },
      },
    },
  };
}

export async function listRecentAgentRunActivity(
  userId: string,
  limit = 10,
): Promise<DashboardActivityItem[]> {
  const runs = await prisma.agentRun.findMany({
    where: {
      project: userProjectsFilter(userId),
    },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
    take: limit,
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  return runs.map((run) => {
    const label = AGENT_TYPE_LABELS[run.agentType as AgentType];
    const timestamp = run.completedAt ?? run.startedAt;
    const statusLabel =
      run.status === "COMPLETED"
        ? "completed"
        : run.status === "FAILED"
          ? "failed"
          : "started";
    const detail =
      run.status === "COMPLETED" && run.score !== null
        ? `Score ${Math.round(run.score)}`
        : run.status === "FAILED"
          ? (run.error ?? "Failed")
          : "In progress";

    return {
      id: `agent-run-${run.id}`,
      type: "AGENT_RUN",
      title: `${label} scan ${statusLabel}`,
      body: `${run.project.name} · ${detail}`,
      link: `/dashboard/projects/${run.projectId}/intelligence?run=${run.id}`,
      createdAt: timestamp.toISOString(),
    };
  });
}
