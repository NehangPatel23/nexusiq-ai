import { readFileSync } from "node:fs";
import path from "node:path";

import type { ConfidenceLevel, Prisma } from "@prisma/client";

import {
  getAgentRunWithFindings,
  getLatestCompletedRunsByAgent,
} from "@/features/intelligence/lib/agent-runs";
import {
  buildScenarioRetrievalQuery,
  computeSimulationDelta,
  type BaselineScores,
} from "@/features/simulator/lib/delta";
import {
  normalizeSimulationParameters,
  simulatorLlmOutputSchema,
  type ScenarioName,
  type SimulationParameters,
  type SimulatorLlmOutput,
} from "@/features/simulator/schemas";
import { OllamaUnavailableError, rethrowOllamaChatFailure } from "@/lib/ai/agents/run-agent";
import { buildContext } from "@/lib/ai/chat/rag-chat";
import { getOllamaClient, type OllamaClient } from "@/lib/ai/ollama-client";
import { retrieveForRag } from "@/lib/ai/retrieval";
import { prisma } from "@/lib/db";

export class SimulationPrerequisiteError extends Error {
  readonly code = "SIMULATION_PREREQUISITE";

  constructor(
    public readonly missing: string[],
    message?: string,
  ) {
    super(
      message ??
        `Run Financial and Risk agents before simulating. Missing: ${missing.join(", ")}.`,
    );
    this.name = "SimulationPrerequisiteError";
  }
}

function loadSimulatorSystemPrompt(): string {
  const markdown = readFileSync(path.join(process.cwd(), "prompts", "risk-simulator.md"), "utf8");
  const match = markdown.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);
  if (!match?.[1]) {
    throw new Error("risk-simulator.md does not contain a system prompt code block");
  }
  return match[1].trim();
}

function parseSimulatorJson(raw: string): SimulatorLlmOutput {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Simulator model returned non-JSON output");
    }
    json = JSON.parse(match[0]);
  }
  return simulatorLlmOutputSchema.parse(json);
}

function asRecommendation(output: Record<string, unknown> | null): string | null {
  if (!output) return null;
  const value = output.recommendation ?? output.updatedRecommendation;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function loadSimulationBaseline(projectId: string): Promise<{
  baselineScores: BaselineScores;
  baselineRunIds: string[];
  financialSummary: string;
  riskSummary: string;
}> {
  const latest = await getLatestCompletedRunsByAgent(projectId);
  const financial = latest.get("FINANCIAL");
  const risk = latest.get("RISK");

  const missing: string[] = [];
  if (!financial) missing.push("FINANCIAL");
  if (!risk) missing.push("RISK");
  if (missing.length > 0) {
    throw new SimulationPrerequisiteError(missing);
  }

  const [financialDetail, riskDetail] = await Promise.all([
    getAgentRunWithFindings(financial!.id),
    getAgentRunWithFindings(risk!.id),
  ]);

  const topFindings = [...(financialDetail?.findings ?? []), ...(riskDetail?.findings ?? [])]
    .filter((f) => f.status === "OPEN")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 8)
    .map((f) => ({
      id: f.id,
      agentType: f.agentType,
      title: f.title,
      severity: f.severity,
      score: f.score,
    }));

  const baselineScores: BaselineScores = {
    financial: financialDetail?.score ?? financial!.score,
    risk: riskDetail?.score ?? risk!.score,
    financialRecommendation: asRecommendation(financialDetail?.output ?? null),
    riskRecommendation: asRecommendation(riskDetail?.output ?? null),
    topFindings,
  };

  return {
    baselineScores,
    baselineRunIds: [financial!.id, risk!.id],
    financialSummary: [
      `Financial health score: ${baselineScores.financial ?? "n/a"}`,
      `Confidence: ${financialDetail?.confidence ?? financial!.confidence ?? "n/a"}`,
      baselineScores.financialRecommendation
        ? `Recommendation: ${baselineScores.financialRecommendation}`
        : null,
      financialDetail?.output
        ? `Output keys: ${Object.keys(financialDetail.output).join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
    riskSummary: [
      `Enterprise risk score: ${baselineScores.risk ?? "n/a"}`,
      `Confidence: ${riskDetail?.confidence ?? risk!.confidence ?? "n/a"}`,
      baselineScores.riskRecommendation
        ? `Recommendation: ${baselineScores.riskRecommendation}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

type RunSimulationDependencies = {
  retrieve: typeof retrieveForRag;
  ollama: Pick<OllamaClient, "healthCheck" | "chat">;
};

const defaultDependencies = (): RunSimulationDependencies => ({
  retrieve: retrieveForRag,
  ollama: getOllamaClient(),
});

export type RunSimulationInput = {
  projectId: string;
  scenarioName: ScenarioName;
  parameters?: SimulationParameters;
  triggeredById?: string;
};

export type SimulationRunView = {
  id: string;
  projectId: string;
  scenarioName: string;
  parameters: Record<string, unknown>;
  baselineScores: BaselineScores;
  simulatedScores: { financial: number; risk: number };
  delta: ReturnType<typeof computeSimulationDelta>["delta"];
  recommendation: string | null;
  keyImpacts: SimulatorLlmOutput["keyImpacts"];
  confidence: ConfidenceLevel | null;
  baselineRunIds: string[];
  createdAt: string;
};

function mapSimulationRow(row: {
  id: string;
  projectId: string;
  scenarioName: string;
  parameters: Prisma.JsonValue;
  baselineScores: Prisma.JsonValue;
  simulatedScores: Prisma.JsonValue;
  delta: Prisma.JsonValue;
  recommendation: string | null;
  keyImpacts: Prisma.JsonValue | null;
  confidence: ConfidenceLevel | null;
  baselineRunIds: string[];
  createdAt: Date;
}): SimulationRunView {
  return {
    id: row.id,
    projectId: row.projectId,
    scenarioName: row.scenarioName,
    parameters:
      row.parameters && typeof row.parameters === "object" && !Array.isArray(row.parameters)
        ? (row.parameters as Record<string, unknown>)
        : {},
    baselineScores: row.baselineScores as unknown as BaselineScores,
    simulatedScores: row.simulatedScores as unknown as { financial: number; risk: number },
    delta: row.delta as unknown as ReturnType<typeof computeSimulationDelta>["delta"],
    recommendation: row.recommendation,
    keyImpacts: Array.isArray(row.keyImpacts)
      ? (row.keyImpacts as SimulatorLlmOutput["keyImpacts"])
      : [],
    confidence: row.confidence,
    baselineRunIds: row.baselineRunIds,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function runSimulation(
  input: RunSimulationInput,
  dependenciesOverride?: Partial<RunSimulationDependencies>,
): Promise<SimulationRunView> {
  const dependencies = { ...defaultDependencies(), ...dependenciesOverride };
  const parameters = normalizeSimulationParameters(
    input.scenarioName,
    input.parameters ?? {},
  );

  const baseline = await loadSimulationBaseline(input.projectId);

  const health = await dependencies.ollama.healthCheck();
  if (!health.ok) {
    throw new OllamaUnavailableError(
      "Risk simulator is unavailable because Ollama could not be reached. Please try again shortly.",
    );
  }

  const query = buildScenarioRetrievalQuery(input.scenarioName, parameters);
  let context = "";
  let retrievalEmpty = false;
  try {
    const retrieval = await dependencies.retrieve(input.projectId, query, {
      mode: "hybrid",
      limit: 12,
    });
    retrievalEmpty = retrieval.results.length === 0;
    context = buildContext(retrieval.results);
  } catch {
    retrievalEmpty = true;
    context = "";
  }

  const system = loadSimulatorSystemPrompt();
  const userPrompt = [
    `Scenario name: ${input.scenarioName}`,
    `Scenario parameters (JSON): ${JSON.stringify(parameters)}`,
    "",
    "Baseline scores (JSON):",
    JSON.stringify(baseline.baselineScores, null, 2),
    "",
    "Financial baseline summary:",
    baseline.financialSummary,
    "",
    "Risk baseline summary:",
    baseline.riskSummary,
    "",
    retrievalEmpty
      ? "Document context: NONE (empty retrieval — base adjustments on baseline scores and state low/insufficient confidence)."
      : `Document context:\n${context}`,
    "",
    "Respond with the required JSON object only.",
  ].join("\n");

  let llm: SimulatorLlmOutput;
  try {
    const rawContent = await dependencies.ollama.chat(
      [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      { format: "json" },
    );
    llm = parseSimulatorJson(rawContent);
  } catch (error) {
    rethrowOllamaChatFailure(error);
  }

  if (retrievalEmpty && (llm!.confidence === "HIGH" || llm!.confidence === "MEDIUM")) {
    llm = { ...llm!, confidence: "LOW" };
  }

  const { simulatedScores, delta } = computeSimulationDelta(baseline.baselineScores, llm!);

  const row = await prisma.simulationRun.create({
    data: {
      projectId: input.projectId,
      scenarioName: input.scenarioName,
      parameters: parameters as Prisma.InputJsonValue,
      baselineScores: baseline.baselineScores as unknown as Prisma.InputJsonValue,
      simulatedScores: simulatedScores as unknown as Prisma.InputJsonValue,
      delta: delta as unknown as Prisma.InputJsonValue,
      recommendation: llm!.updatedRecommendation,
      keyImpacts: llm!.keyImpacts as unknown as Prisma.InputJsonValue,
      confidence: llm!.confidence,
      baselineRunIds: baseline.baselineRunIds,
      triggeredById: input.triggeredById,
    },
  });

  const { logAuditForProject } = await import("@/features/history/lib/audit");
  void logAuditForProject(input.projectId, {
    userId: input.triggeredById ?? null,
    action: "SIMULATION",
    entityType: "SimulationRun",
    entityId: row.id,
    metadata: { projectId: input.projectId, scenarioName: input.scenarioName },
  });

  return mapSimulationRow(row);
}

export async function listSimulationRuns(projectId: string, limit = 20) {
  const rows = await prisma.simulationRun.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(mapSimulationRow);
}

export async function getSimulationRun(id: string) {
  const row = await prisma.simulationRun.findUnique({ where: { id } });
  return row ? mapSimulationRow(row) : null;
}

export async function getSimulationPrerequisites(projectId: string) {
  const latest = await getLatestCompletedRunsByAgent(projectId);
  return {
    financial: Boolean(latest.get("FINANCIAL")),
    risk: Boolean(latest.get("RISK")),
    ready: Boolean(latest.get("FINANCIAL") && latest.get("RISK")),
  };
}
