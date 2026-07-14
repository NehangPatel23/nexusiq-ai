import { describe, expect, it } from "vitest";

import { AUDIENCE_PRESETS, getAudiencePreset } from "@/features/reports/lib/audience-presets";
import { buildReportSnapshot } from "@/features/reports/lib/snapshot";
import type { IntelligenceContext } from "@/features/reports/lib/context";
import { parseMarkdownBlocks } from "@/lib/export/pdf";

function emptyCtx(overrides?: Partial<IntelligenceContext>): IntelligenceContext {
  return {
    projectId: "proj-1",
    projectName: "Acme",
    agentRuns: {},
    consensus: null,
    findings: [],
    citations: [],
    hasAnyIntelligence: false,
    hasExecutive: false,
    sourceAgentRunIds: [],
    ...overrides,
  };
}

describe("audience presets", () => {
  it("includes board pack with PDF + PPTX", () => {
    const board = getAudiencePreset("BOARD_PACK");
    expect(board?.reportType).toBe("BOARD");
    expect(board?.formats).toEqual(expect.arrayContaining(["PDF", "PPTX"]));
    expect(AUDIENCE_PRESETS.length).toBeGreaterThanOrEqual(4);
  });
});

describe("report snapshot", () => {
  it("pins agent runs and consensus as-of generation", () => {
    const snapshot = buildReportSnapshot(
      emptyCtx({
        findings: [
          {
            id: "f1",
            projectId: "proj-1",
            agentType: "RISK",
            agentRunId: "run-r",
            category: "ops",
            title: "Concentration",
            description: "x",
            severity: "HIGH",
            score: 80,
            sourceChunkId: null,
            documentId: null,
            metadata: null,
            status: "OPEN",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        consensus: {
          id: "c1",
          projectId: "proj-1",
          agentRunIds: [],
          finalRecommendation: "Proceed with conditions",
          decisionConfidence: "MEDIUM",
          agreements: [],
          conflicts: [],
          resolutionRationale: "rationale",
          agentOpinions: [],
          citations: [],
          triggeredById: null,
          createdAt: "2026-07-01T00:00:00.000Z",
        },
        agentRuns: {
          RISK: {
            id: "run-r",
            projectId: "proj-1",
            agentType: "RISK",
            status: "COMPLETED",
            score: 72,
            confidence: "MEDIUM",
            startedAt: "2026-07-01T00:00:00.000Z",
            completedAt: "2026-07-01T00:05:00.000Z",
            error: null,
            findingCount: 1,
            citations: [],
            output: {},
            findings: [],
          },
        },
      }),
    );

    expect(snapshot.openFindingCount).toBe(1);
    expect(snapshot.consensus?.finalRecommendation).toContain("Proceed");
    expect(snapshot.agentRuns[0]?.agentType).toBe("RISK");
  });
});

describe("executive/board PDF narrative polish", () => {
  it("wraps recommendation and key findings into callout/narrative blocks", () => {
    const blocks = parseMarkdownBlocks(`# Board Report — Acme

## Recommendation

Proceed with conditions pending remediation of concentration risk.

## Key Findings

- Vendor concentration above policy threshold
- Missing SOC 2 Type II for subsidiaries
`);

    expect(blocks.some((block) => block.type === "callout")).toBe(true);
    expect(blocks.some((block) => block.type === "narrative")).toBe(true);
    const callout = blocks.find((block) => block.type === "callout");
    if (callout?.type === "callout") {
      expect(callout.text).toContain("Proceed with conditions");
    }
  });
});
