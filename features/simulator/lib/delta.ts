import type { SimulatorLlmOutput } from "@/features/simulator/schemas";

export type BaselineScores = {
  financial: number | null;
  risk: number | null;
  financialRecommendation: string | null;
  riskRecommendation: string | null;
  topFindings: Array<{
    id: string;
    agentType: string;
    title: string;
    severity: string | null;
    score: number | null;
  }>;
};

export type SimulatedScores = {
  financial: number;
  risk: number;
};

export type SimulationDelta = {
  financialDelta: number;
  riskDelta: number;
  scoreDiffs: {
    financial: { baseline: number | null; simulated: number; delta: number };
    risk: { baseline: number | null; simulated: number; delta: number };
  };
  narrative: string;
  scenarioSummary: string;
};

function coerceScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, value));
}

export function computeSimulationDelta(
  baseline: BaselineScores,
  llm: SimulatorLlmOutput,
): { simulatedScores: SimulatedScores; delta: SimulationDelta } {
  const financialBaseline = coerceScore(baseline.financial);
  const riskBaseline = coerceScore(baseline.risk);
  const financialSim = coerceScore(llm.adjustedFinancialScore) ?? 0;
  const riskSim = coerceScore(llm.adjustedRiskScore) ?? 0;

  const financialDelta =
    financialBaseline === null ? financialSim : financialSim - financialBaseline;
  const riskDelta = riskBaseline === null ? riskSim : riskSim - riskBaseline;

  return {
    simulatedScores: { financial: financialSim, risk: riskSim },
    delta: {
      financialDelta,
      riskDelta,
      scoreDiffs: {
        financial: {
          baseline: financialBaseline,
          simulated: financialSim,
          delta: financialDelta,
        },
        risk: {
          baseline: riskBaseline,
          simulated: riskSim,
          delta: riskDelta,
        },
      },
      narrative: llm.deltaFromBaseline,
      scenarioSummary: llm.scenarioSummary,
    },
  };
}

export function buildScenarioRetrievalQuery(
  scenarioName: string,
  parameters: Record<string, unknown>,
): string {
  const parts = [
    "financial risk revenue valuation cash flow lawsuit customer churn pricing",
    `scenario ${scenarioName.replace(/_/g, " ")}`,
  ];

  if (typeof parameters.revenueChangePct === "number") {
    parts.push(`revenue change ${parameters.revenueChangePct}%`);
  }
  if (parameters.customerLost !== undefined) {
    parts.push(`customer loss ${String(parameters.customerLost)}`);
  }
  if (parameters.lawsuitOutcome) {
    parts.push(`lawsuit ${String(parameters.lawsuitOutcome)}`);
    if (typeof parameters.amount === "number") {
      parts.push(`amount ${parameters.amount}`);
    }
  }
  if (typeof parameters.priceChangePct === "number") {
    parts.push(`price change ${parameters.priceChangePct}%`);
  }
  if (typeof parameters.notes === "string" && parameters.notes.trim()) {
    parts.push(parameters.notes.trim());
  }

  return parts.join(" ");
}
