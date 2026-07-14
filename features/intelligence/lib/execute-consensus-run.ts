import { createNotification } from "@/features/organizations/lib/notifications";
import { logDataRoomAudit } from "@/features/data-room/lib/audit";
import { logAuditForProject } from "@/features/history/lib/audit";
import {
  buildConsensusApiResponse,
  createConsensusRun,
  getConsensusRunById,
  getRecentConsensusRun,
} from "@/features/intelligence/lib/consensus-runs";
import { runConsensusEngine } from "@/lib/ai/agents/consensus";

export async function executeConsensusRun(input: {
  projectId: string;
  triggeredById?: string;
  force?: boolean;
  agentRunIds?: string[];
}) {
  if (!input.force && !input.agentRunIds?.length) {
    const recent = await getRecentConsensusRun(input.projectId);
    if (recent) {
      return buildConsensusApiResponse(recent, { cached: true });
    }
  }

  const result = await runConsensusEngine(input.projectId, {
    agentRunIds: input.agentRunIds,
  });

  const created = await createConsensusRun({
    projectId: input.projectId,
    agentRunIds: result.agentRunIds,
    finalRecommendation: result.finalRecommendation,
    decisionConfidence: result.decisionConfidence,
    agreements: result.agreements,
    conflicts: result.conflicts,
    resolutionRationale: result.resolutionRationale,
    agentOpinions: result.agentOpinions,
    citations: result.citations,
    triggeredById: input.triggeredById,
  });

  await logDataRoomAudit({
    projectId: input.projectId,
    actorId: input.triggeredById ?? null,
    action: "AGENT_RUN_COMPLETED",
    resourceType: "PROJECT",
    resourceId: created.id,
    resourceName: "Consensus run",
    metadata: {
      consensusRunId: created.id,
      decisionConfidence: created.decisionConfidence,

      agentRunIds: created.agentRunIds,
      conflictCount: result.conflicts.length,
      usedModel: result.usedModel,
      summary: `Consensus completed · ${created.decisionConfidence}`,
    },
  }).catch(() => undefined);

  void logAuditForProject(input.projectId, {
    userId: input.triggeredById ?? null,
    action: "CONSENSUS",
    entityType: "ConsensusRun",
    entityId: created.id,
    metadata: {
      projectId: input.projectId,
      decisionConfidence: created.decisionConfidence,
    },
  });

  if (input.triggeredById) {
    await createNotification({
      userId: input.triggeredById,
      type: "SYSTEM",
      title: "Consensus synthesis completed",
      body: "Review agent opinions, conflicts, and the final recommendation.",
      link: `/dashboard/projects/${input.projectId}/intelligence?tab=consensus&consensus=${created.id}`,
    }).catch(() => undefined);
  }

  const detail = await getConsensusRunById(created.id);
  if (!detail) {
    throw new Error("Completed consensus run could not be loaded.");
  }

  return buildConsensusApiResponse(detail);
}
