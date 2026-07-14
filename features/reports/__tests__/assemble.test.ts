import { describe, expect, it } from "vitest";

import {
  buildRiskRegisterRows,
  humanizeLabel,
  INSUFFICIENT_CONTEXT_HEADING,
  riskRegisterMarkdown,
} from "@/features/reports/lib/assemble-shared";
import { assembleReportMarkdown } from "@/features/reports/lib/assemble";
import type { IntelligenceContext } from "@/features/reports/lib/context";
import { buildReportStorageKey } from "@/lib/storage";

function emptyCtx(overrides?: Partial<IntelligenceContext>): IntelligenceContext {
  return {
    projectId: "proj-1",
    projectName: "Acme Deal",
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

describe("buildReportStorageKey", () => {
  it("builds nested org/project/report keys", () => {
    expect(
      buildReportStorageKey({
        organizationId: "org-1",
        projectId: "proj-1",
        reportId: "rep-1",
        format: "pdf",
        fileName: "Board Report.pdf",
      }),
    ).toBe("organizations/org-1/projects/proj-1/reports/rep-1/pdf/Board_Report.pdf");
  });
});

describe("humanizeLabel", () => {
  it("converts camelCase to spaced Title Case", () => {
    expect(humanizeLabel("relatedParty")).toBe("Related Party");
    expect(humanizeLabel("ghostVendor")).toBe("Ghost Vendor");
    expect(humanizeLabel("GDPR")).toBe("GDPR");
  });
});

describe("risk register assembler", () => {
  it("builds rows from findings", () => {
    const rows = buildRiskRegisterRows(
      [
        {
          id: "f1",
          projectId: "proj-1",
          agentType: "RISK",
          agentRunId: "run-1",
          category: "relatedParty",
          title: "Key person risk",
          description: "CEO concentration",
          severity: "HIGH",
          score: 70,
          sourceChunkId: "chunk-1",
          documentId: "doc-1",
          metadata: { remediation: "Rotate access and document succession plan." },
          status: "OPEN",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      [
        {
          documentId: "doc-1",
          chunkId: "chunk-1",
          documentName: "Org-Chart.pdf",
          excerpt: "CEO",
        },
      ],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.category).toBe("Related Party");
    expect(rows[0]?.agent).toBe("Risk");
    expect(rows[0]?.citation).toContain("[1]");
    expect(rows[0]?.citationIndex).toBe(1);
    expect(rows[0]?.remediation).toContain("Rotate access");
    expect(riskRegisterMarkdown(rows, "Acme Deal")).toContain("How to close");
    expect(riskRegisterMarkdown(rows, "Acme Deal")).toContain("| HIGH |");
  });
});

describe("assembleReportMarkdown", () => {
  it("assembles EXECUTIVE from executive AgentRun markdown without inventing content", () => {
    const result = assembleReportMarkdown(
      "EXECUTIVE",
      emptyCtx({
        hasAnyIntelligence: true,
        hasExecutive: true,
        agentRuns: {
          EXECUTIVE: {
            id: "exec-1",
            projectId: "proj-1",
            agentType: "EXECUTIVE",
            status: "COMPLETED",
            score: 72,
            confidence: "HIGH",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            error: null,
            findingCount: 0,
            output: {
              markdown: "## Executive Summary\n\nDeal looks workable with caveats.",
              executiveSummary: "Deal looks workable with caveats.",
              recommendation: "Proceed with conditions",
              priorityActions: ["Confirm ARR"],
            },
            citations: [],
            findings: [],
          },
        },
        consensus: {
          id: "c1",
          projectId: "proj-1",
          agentRunIds: ["exec-1"],
          finalRecommendation: "Proceed with conditions",
          decisionConfidence: "HIGH",
          agreements: [],
          conflicts: [],
          resolutionRationale: "Specialists mostly aligned.",
          agentOpinions: [],
          citations: [],
          triggeredById: null,
          createdAt: new Date().toISOString(),
        },
        sourceAgentRunIds: ["exec-1"],
      }),
    );

    expect(result.content).toContain("Deal looks workable with caveats.");
    expect(result.content).toContain("Consensus Recommendation");
    expect(result.content).toContain("Proceed with conditions");
  });

  it("marks insufficient context when intelligence is missing", () => {
    const result = assembleReportMarkdown("INVESTMENT_MEMO", emptyCtx());
    expect(result.insufficient).toBe(true);
    expect(result.content).toContain(INSUFFICIENT_CONTEXT_HEADING);
  });

  it("builds RISK_REGISTER table without requiring narrative agents", () => {
    const result = assembleReportMarkdown(
      "RISK_REGISTER",
      emptyCtx({
        hasAnyIntelligence: true,
        findings: [
          {
            id: "f1",
            projectId: "proj-1",
            agentType: "FRAUD",
            agentRunId: null,
            category: "Vendor",
            title: "Duplicate invoices",
            description: "Two invoices with same amount",
            severity: "CRITICAL",
            score: 90,
            sourceChunkId: null,
            documentId: "doc-9",
            metadata: null,
            status: "OPEN",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    );

    expect(result.content).toContain("Duplicate invoices");
    expect(result.content).toContain("| CRITICAL |");
    expect(result.riskRegisterRows?.[0]?.description).toContain("Two invoices");
  });

  it("builds ACTION_PLAN cards with structured items", () => {
    const result = assembleReportMarkdown(
      "ACTION_PLAN",
      emptyCtx({
        hasAnyIntelligence: true,
        findings: [
          {
            id: "f1",
            projectId: "proj-1",
            agentType: "RISK",
            agentRunId: null,
            category: "cyber",
            title: "Encryption gap",
            description: "Legacy system lacks encryption at rest",
            severity: "HIGH",
            score: 80,
            sourceChunkId: "c1",
            documentId: "d1",
            metadata: null,
            status: "OPEN",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        agentRuns: {
          EXECUTIVE: {
            id: "exec-1",
            projectId: "proj-1",
            agentType: "EXECUTIVE",
            status: "COMPLETED",
            score: 70,
            confidence: "MEDIUM",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            error: null,
            findingCount: 0,
            output: { priorityActions: ["Confirm insurance coverage"] },
            citations: [],
            findings: [],
          },
        },
      }),
    );

    expect(result.content).toContain("### P1. Confirm insurance coverage");
    expect(result.content).toContain("How to close");
    expect(result.actionPlanItems?.length).toBeGreaterThanOrEqual(2);
  });

  it("builds PPTX slide outline JSON alongside markdown", () => {
    const result = assembleReportMarkdown("PPTX", emptyCtx({ hasAnyIntelligence: true }));
    expect(result.slideOutline?.slides.length).toBeGreaterThan(0);
    expect(result.content).toContain("Slide Deck Outline");
  });
});
