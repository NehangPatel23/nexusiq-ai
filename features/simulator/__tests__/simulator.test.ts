import { describe, expect, it } from "vitest";

import {
  computeSimulationDelta,
  buildScenarioRetrievalQuery,
} from "@/features/simulator/lib/delta";
import {
  normalizeSimulationParameters,
  runSimulationBodySchema,
  simulationParametersSchema,
} from "@/features/simulator/schemas";

describe("simulator schemas", () => {
  it("normalizes revenue_decline defaults and aliases", () => {
    const normalized = normalizeSimulationParameters("revenue_decline", {
      revenueChange: -25,
    });
    expect(normalized.revenueChangePct).toBe(-25);
    expect(normalized.revenueChange).toBeUndefined();
  });

  it("applies lawsuit_loss defaults", () => {
    const normalized = normalizeSimulationParameters("lawsuit_loss", {});
    expect(normalized.lawsuitOutcome).toBe("loss");
  });

  it("validates run body", () => {
    const parsed = runSimulationBodySchema.parse({
      scenarioName: "price_change",
      parameters: { priceChangePct: 12 },
    });
    expect(parsed.scenarioName).toBe("price_change");
    expect(parsed.parameters.priceChangePct).toBe(12);
  });

  it("rejects invalid revenueChangePct", () => {
    expect(() =>
      simulationParametersSchema.parse({ revenueChangePct: -200 }),
    ).toThrow();
  });
});

describe("computeSimulationDelta", () => {
  it("computes financial and risk deltas", () => {
    const { simulatedScores, delta } = computeSimulationDelta(
      {
        financial: 70,
        risk: 40,
        financialRecommendation: "Hold",
        riskRecommendation: "Monitor",
        topFindings: [],
      },
      {
        scenarioSummary: "Revenue drops",
        adjustedFinancialScore: 55,
        adjustedRiskScore: 62,
        keyImpacts: [],
        updatedRecommendation: "Defer",
        deltaFromBaseline: "Worsened risk",
        confidence: "MEDIUM",
      },
    );

    expect(simulatedScores).toEqual({ financial: 55, risk: 62 });
    expect(delta.financialDelta).toBe(-15);
    expect(delta.riskDelta).toBe(22);
    expect(delta.scoreDiffs.financial.baseline).toBe(70);
  });
});

describe("buildScenarioRetrievalQuery", () => {
  it("includes scenario levers", () => {
    const query = buildScenarioRetrievalQuery("revenue_decline", {
      revenueChangePct: -20,
    });
    expect(query).toContain("revenue change -20%");
    expect(query).toContain("revenue decline");
  });
});
