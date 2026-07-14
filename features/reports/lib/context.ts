import type { AgentType, FindingSeverity, RiskStatus } from "@prisma/client";

import {
  getAgentRunWithFindings,
  getLatestCompletedRunsByAgent,
  type AgentRunDetail,
  type FindingItem,
} from "@/features/intelligence/lib/agent-runs";
import {
  getLatestConsensusRun,
  type ConsensusRunDetail,
} from "@/features/intelligence/lib/consensus-runs";
import type { ChatCitation } from "@/lib/ai/citations";
import { prisma } from "@/lib/db";

const SEVERITY_ORDER: FindingSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export type IntelligenceContext = {
  projectId: string;
  projectName: string;
  agentRuns: Partial<Record<AgentType, AgentRunDetail>>;
  consensus: ConsensusRunDetail | null;
  findings: FindingItem[];
  citations: ChatCitation[];
  hasAnyIntelligence: boolean;
  hasExecutive: boolean;
  sourceAgentRunIds: string[];
};

function sortFindingsBySeverity(findings: FindingItem[]): FindingItem[] {
  return [...findings].sort((a, b) => {
    const aRank = a.severity ? SEVERITY_ORDER.indexOf(a.severity) : SEVERITY_ORDER.length;
    const bRank = b.severity ? SEVERITY_ORDER.indexOf(b.severity) : SEVERITY_ORDER.length;
    if (aRank !== bRank) return aRank - bRank;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function mergeCitations(runs: AgentRunDetail[], consensus: ConsensusRunDetail | null): ChatCitation[] {
  const seen = new Set<string>();
  const citations: ChatCitation[] = [];
  const push = (items: ChatCitation[]) => {
    for (const citation of items) {
      const key = `${citation.documentId}:${citation.chunkId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      citations.push(citation);
    }
  };
  for (const run of runs) push(run.citations);
  if (consensus) push(consensus.citations);
  return citations;
}

export async function loadIntelligenceContext(
  projectId: string,
  projectName: string,
): Promise<IntelligenceContext> {
  const [latestByAgent, consensus, openFindings] = await Promise.all([
    getLatestCompletedRunsByAgent(projectId),
    getLatestConsensusRun(projectId),
    prisma.finding.findMany({
      where: {
        projectId,
        status: { in: ["OPEN", "ACKNOWLEDGED"] satisfies RiskStatus[] },
      },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
  ]);

  const runIds = [...latestByAgent.values()].map((run) => run.id);
  const details = await Promise.all(runIds.map((id) => getAgentRunWithFindings(id)));
  const agentRuns: Partial<Record<AgentType, AgentRunDetail>> = {};
  for (const detail of details) {
    if (!detail) continue;
    agentRuns[detail.agentType] = detail;
  }

  const findings = sortFindingsBySeverity(
    openFindings.map((finding) => ({
      id: finding.id,
      projectId: finding.projectId,
      agentType: finding.agentType,
      agentRunId: finding.agentRunId,
      category: finding.category,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      score: finding.score,
      sourceChunkId: finding.sourceChunkId,
      documentId: finding.documentId,
      metadata:
        finding.metadata && typeof finding.metadata === "object" && !Array.isArray(finding.metadata)
          ? (finding.metadata as Record<string, unknown>)
          : null,
      status: finding.status,
      createdAt: finding.createdAt.toISOString(),
      updatedAt: finding.updatedAt.toISOString(),
    })),
  );

  const runDetails = Object.values(agentRuns).filter(Boolean) as AgentRunDetail[];

  return {
    projectId,
    projectName,
    agentRuns,
    consensus,
    findings,
    citations: mergeCitations(runDetails, consensus),
    hasAnyIntelligence: runDetails.length > 0 || Boolean(consensus) || findings.length > 0,
    hasExecutive: Boolean(agentRuns.EXECUTIVE),
    sourceAgentRunIds: runIds,
  };
}
