import type { AgentType } from "@prisma/client";

import { notifyAgentRunCompleted } from "@/features/intelligence/lib/agent-run-notifications";
import {
  buildAgentRunApiResponse,
  completeAgentRun,
  createAgentRun,
  failAgentRun,
  getAgentRunWithFindings,
  getRecentCompletedAgentRun,
  getRunningAgentRun,
} from "@/features/intelligence/lib/agent-runs";
import { logAgentRunAudit } from "@/features/intelligence/lib/intelligence-audit";
import { runComplianceAgent } from "@/lib/ai/agents/compliance";
import { runFinancialAgent } from "@/lib/ai/agents/financial";
import { runFraudAgent } from "@/lib/ai/agents/fraud";
import { runLegalAgent } from "@/lib/ai/agents/legal";
import { runRiskAgent } from "@/lib/ai/agents/risk";
import { OllamaUnavailableError } from "@/lib/ai/agents/run-agent";

const AGENT_RUNNERS = {
  FINANCIAL: runFinancialAgent,
  LEGAL: runLegalAgent,
  COMPLIANCE: runComplianceAgent,
  RISK: runRiskAgent,
  FRAUD: runFraudAgent,
} as const;

export async function executeAgentRun(input: {
  projectId: string;
  agentType: AgentType;
  triggeredById?: string;
  force?: boolean;
}) {
  if (!input.force) {
    const running = await getRunningAgentRun(input.projectId, input.agentType);
    if (running) {
      throw new Error("An agent scan is already running for this project.");
    }

    const recent = await getRecentCompletedAgentRun(input.projectId, input.agentType);
    if (recent) {
      const detail = await getAgentRunWithFindings(recent.id);
      if (detail) {
        return buildAgentRunApiResponse(detail, { cached: true });
      }
    }
  }

  const run = await createAgentRun({
    projectId: input.projectId,
    agentType: input.agentType,
    triggeredById: input.triggeredById,
    inputParams: { force: input.force ?? false },
  });

  try {
    const result = await AGENT_RUNNERS[input.agentType](input.projectId);
    const persisted = await completeAgentRun({
      runId: run.id,
      projectId: input.projectId,
      agentType: input.agentType,
      output: result.output as Record<string, unknown>,
      score: result.score,
      confidence: result.confidence,
      citations: result.citations,
      findings: result.findings,
    });

    await logAgentRunAudit({
      projectId: input.projectId,
      actorId: input.triggeredById,
      agentType: input.agentType,
      runId: run.id,
      status: "COMPLETED",
      score: persisted.run.score,
      findingCount: persisted.findings.length,
    }).catch(() => undefined);

    if (input.triggeredById) {
      await notifyAgentRunCompleted({
        userId: input.triggeredById,
        projectId: input.projectId,
        agentType: input.agentType,
        runId: run.id,
        findings: persisted.findings.map((finding) => ({
          severity: finding.severity,
          title: finding.title,
        })),
      }).catch(() => undefined);
    }

    const detail = await getAgentRunWithFindings(run.id);
    if (!detail) {
      throw new Error("Completed agent run could not be loaded.");
    }

    return buildAgentRunApiResponse(detail);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Agent run failed unexpectedly.";
    await failAgentRun(run.id, message);

    await logAgentRunAudit({
      projectId: input.projectId,
      actorId: input.triggeredById,
      agentType: input.agentType,
      runId: run.id,
      status: "FAILED",
      findingCount: 0,
    }).catch(() => undefined);

    if (error instanceof OllamaUnavailableError) {
      throw error;
    }

    return {
      runId: run.id,
      agentType: input.agentType,
      status: "failed" as const,
      confidence: "INSUFFICIENT" as const,
      findings: [],
      citations: [],
      output: null,
      error: message,
    };
  }
}
