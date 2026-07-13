import { describe, expect, it } from "vitest";

import {
  deriveExecutiveCompositeScore,
  parseExecutiveMarkdown,
} from "@/lib/ai/agents/executive-parser";
import {
  missingSpecialistAgents,
  parseConsensusJsonResult,
  preserveAgentOpinions,
} from "@/lib/ai/agents/consensus-schema";
import type { SpecialistConsensusInput } from "@/lib/ai/agents/consensus-schema";

describe("executive markdown parser", () => {
  it("extracts sections, recommendation, priority actions, and confidence", () => {
    const parsed = parseExecutiveMarkdown(`## Executive Summary
Strong pipeline with manageable legal risk.

## Recommendation
Further Diligence

## Priority Actions
- Request audited financials
- Review change-of-control clauses

CONFIDENCE: MEDIUM`);

    expect(parsed.executiveSummary).toContain("Strong pipeline");
    expect(parsed.recommendation).toContain("Further Diligence");
    expect(parsed.priorityActions).toEqual([
      "Request audited financials",
      "Review change-of-control clauses",
    ]);
    expect(parsed.confidence).toBe("MEDIUM");
    expect(parsed.acquisitionRecommendation).toBe("Further Diligence");
  });

  it("derives composite score from specialist scores", () => {
    expect(deriveExecutiveCompositeScore([80, 70, null, 60])).toBe(70);
    expect(deriveExecutiveCompositeScore([null, undefined])).toBeNull();
  });
});

describe("consensus schema helpers", () => {
  it("parses consensus JSON", () => {
    const result = parseConsensusJsonResult(
      JSON.stringify({
        agentOpinions: [
          {
            agent: "FINANCIAL",
            score: 80,
            recommendation: "Proceed with caution",
            confidence: "HIGH",
          },
        ],
        agreements: [{ topic: "Revenue quality", agents: ["FINANCIAL"], summary: "Solid ARR" }],
        conflicts: [
          {
            topic: "Legal exposure",
            positions: [{ agent: "LEGAL", position: "High risk" }],
            severity: "HIGH",
          },
        ],
        resolutionRationale: "Weighted financial strength over legal friction.",
        finalRecommendation: "Further Diligence",
        decisionConfidence: "MEDIUM",
        citations: [{ documentId: "doc-1", chunkId: "chunk-1", excerpt: "ARR grew 20%" }],
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.finalRecommendation).toBe("Further Diligence");
    expect(result.data.conflicts).toHaveLength(1);
  });

  it("preserves original agent opinions over LLM drift", () => {
    const sourceRuns: SpecialistConsensusInput[] = [
      {
        agent: "FINANCIAL",
        runId: "run-1",
        score: 82,
        recommendation: "Original financial rec",
        confidence: "HIGH",
        findingsSummary: [],
        citations: [],
      },
      {
        agent: "LEGAL",
        runId: "run-2",
        score: 45,
        recommendation: "Original legal rec",
        confidence: "MEDIUM",
        findingsSummary: [],
        citations: [],
      },
    ];

    const preserved = preserveAgentOpinions(
      [
        {
          agent: "FINANCIAL",
          score: 10,
          recommendation: "Drifted rec",
          confidence: "LOW",
        },
        {
          agent: "LEGAL",
          score: 99,
          recommendation: "Also drifted",
          confidence: "HIGH",
        },
      ],
      sourceRuns,
    );

    expect(preserved).toEqual([
      {
        agent: "FINANCIAL",
        score: 82,
        recommendation: "Original financial rec",
        confidence: "HIGH",
      },
      {
        agent: "LEGAL",
        score: 45,
        recommendation: "Original legal rec",
        confidence: "MEDIUM",
      },
    ]);
  });

  it("lists missing specialist agents for prerequisites", () => {
    expect(missingSpecialistAgents(["FINANCIAL", "LEGAL"])).toEqual([
      "COMPLIANCE",
      "RISK",
      "FRAUD",
    ]);
  });
});
