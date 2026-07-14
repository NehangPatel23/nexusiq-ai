import { describe, expect, it } from "vitest";

import { exportMarkdownBuffer, markdownContentType } from "@/lib/export/markdown";
import {
  exportPdfBuffer,
  parseInlineMarkdown,
  parseMarkdownBlocks,
  pdfContentType,
} from "@/lib/export/pdf";
import { exportPptxBuffer, pptxContentType } from "@/lib/export/pptx";
import { exportRiskRegisterXlsx, xlsxContentType } from "@/lib/export/xlsx";

const FIXTURE_MD = `# Risk Register — Fixture

## Summary

Critical vendor concentration observed.

| Severity | Category | Agent | Title | Citation | Status |
| --- | --- | --- | --- | --- | --- |
| HIGH | Ops | RISK | Key person | doc:1 / chunk:2 | OPEN |
`;

describe("export modules", () => {
  it("parses inline markdown into bold spans", () => {
    const spans = parseInlineMarkdown("Hello **Severity:** MEDIUM and *ok*");
    expect(spans.some((span) => span.bold && span.text === "Severity:")).toBe(true);
    expect(spans.map((span) => span.text).join("")).toContain("MEDIUM");
    expect(spans.some((span) => span.italic && span.text === "ok")).toBe(true);
  });

  it("parses finding cards without leaving markdown markers", () => {
    const blocks = parseMarkdownBlocks(`# Risk Register — Acme

## Findings

### 7. Inadequate Change Management

- **Severity:** MEDIUM
- **Category:** Operational
- **Agent:** Risk
- **Status:** Open
- **Citation:** —

#### Context

No formal change advisory board before production releases.

#### How to close

Assign an owner and due date.

## Citations

1. [Board Minutes] (doc:x, chunk:y)
`);

    const card = blocks.find((block) => block.type === "card");
    expect(card?.type).toBe("card");
    if (card?.type === "card") {
      expect(card.title).toContain("Inadequate Change Management");
      expect(card.severity).toBe("MEDIUM");
      expect(card.category).toBe("Operational");
      expect(card.context).toContain("change advisory board");
      expect(card.howToClose).toContain("Assign an owner");
      expect(card.title.includes("**")).toBe(false);
      expect(card.context?.includes("**")).toBe(false);
    }
  });

  it("exports markdown buffer", () => {
    const buffer = exportMarkdownBuffer(FIXTURE_MD);
    expect(buffer.toString("utf8")).toContain("Key person");
    expect(markdownContentType()).toContain("markdown");
  });

  it("exports pdf from markdown fixture without Ollama", async () => {
    const buffer = await exportPdfBuffer({
      title: "Fixture Report",
      markdown: FIXTURE_MD,
      citations: [
        {
          documentId: "doc-1",
          chunkId: "chunk-1",
          documentName: "Memo.pdf",
          excerpt: "Vendor concentration remains elevated.",
        },
      ],
    });
    expect(buffer.byteLength).toBeGreaterThan(100);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(pdfContentType()).toBe("application/pdf");
  }, 30_000);

  it("exports pdf for long risk-register markdown without Yoga crash", async () => {
    const rows = Array.from({ length: 12 }, (_, i) => {
      const doc = `16825cb3-bb93-4fc1-b0ad-87b6b83b6cd${i}`;
      const chunk = `0fb46042-aaaa-bbbb-cccc-ddddeeee00${String(i).padStart(2, "0")}`;
      return [
        `### ${i + 1}. Finding title ${i}`,
        "",
        `- **Severity:** HIGH`,
        `- **Category:** Related Party`,
        `- **Citation:** [1] Board-Minutes.txt (doc:${doc} / chunk:${chunk})`,
        "",
        "#### Context",
        "",
        "Legacy system lacks encryption at rest for sensitive customer records stored offline.",
        "",
        "#### How to close",
        "",
        "Confirm evidence, assign owner, document remediation, update status.",
        "",
      ].join("\n");
    }).join("\n");

    const markdown = [
      `# Risk Register — Acme Corp Acquisition`,
      "",
      "## Overview",
      "",
      "- **Open findings:** 12",
      "",
      "## Findings",
      "",
      rows,
      "",
      "## Compact table",
      "",
      "| Severity | Category | Agent | Title | Citation | Status |",
      "| --- | --- | --- | --- | --- | --- |",
      ...Array.from({ length: 12 }, (_, i) => {
        const doc = `16825cb3-bb93-4fc1-b0ad-87b6b83b6cd${i}`;
        return `| HIGH | Related Party | Risk | Finding ${i} | doc:${doc} / chunk:abc | Open |`;
      }),
      "",
      "## Citations",
      "",
      "1. [Board-Minutes.txt] (doc:x, chunk:y)",
    ].join("\n");

    const buffer = await exportPdfBuffer({
      title: "Risk Register — Acme Corp Acquisition",
      markdown,
      citations: [
        {
          documentId: "16825cb3-bb93-4fc1-b0ad-87b6b83b6cd5",
          chunkId: "0fb46042-aaaa-bbbb-cccc-ddddeeee0001",
          documentName: "Board-Minutes-2023-Q4-Excerpt.txt",
          excerpt: "encryption at rest gap noted by auditor",
        },
      ],
    });
    expect(buffer.byteLength).toBeGreaterThan(100);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
  }, 45_000);

  it("exports xlsx risk register without Ollama", async () => {
    const buffer = await exportRiskRegisterXlsx({
      projectName: "Fixture",
      rows: [
        {
          severity: "HIGH",
          category: "Ops",
          agent: "RISK",
          title: "Key person",
          description: "CEO concentration",
          citation: "doc:1",
          status: "OPEN",
          citationIndex: null,
          documentId: "doc-1",
          chunkId: "chunk-2",
          score: null,
          remediation: "Assign owner and succession plan.",
        },
      ],
    });
    expect(buffer.byteLength).toBeGreaterThan(100);
    expect(xlsxContentType()).toContain("spreadsheetml");
  }, 30_000);

  it("exports pptx from slide outline without Ollama", async () => {
    const buffer = await exportPptxBuffer({
      projectName: "Fixture",
      outline: {
        title: "Fixture Deck",
        slides: [
          { heading: "Summary", bullets: ["Proceed with conditions", "Confirm ARR"] },
          { heading: "Risks", bullets: ["Vendor concentration"] },
        ],
      },
    });
    expect(buffer.byteLength).toBeGreaterThan(100);
    expect(pptxContentType()).toContain("presentationml");
  });

  it("exports detailed action-plan pptx deck", async () => {
    const { buildDeckFromReport } = await import("@/features/reports/lib/build-deck");
    const deck = buildDeckFromReport({
      title: "Action Plan — Acme",
      projectName: "Acme",
      reportType: "ACTION_PLAN",
      content: "",
      actionPlanItems: [
        {
          id: "1",
          priority: "P1",
          action: "Confirm insurance coverage",
          detail: "Executive priority from latest package.",
          source: "Executive",
          severity: "HIGH",
          citationIndex: null,
          documentId: null,
          chunkId: null,
          remediation: "Assign owner and due date.",
        },
        {
          id: "2",
          priority: "F1",
          action: "Close encryption gap",
          detail: "Legacy system lacks encryption at rest.",
          source: "Risk",
          severity: "HIGH",
          category: "Cyber",
          citationIndex: 1,
          documentId: "d1",
          chunkId: "c1",
          remediation: "Encrypt volumes and attach proof.",
        },
      ],
      citations: [
        {
          documentId: "d1",
          chunkId: "c1",
          documentName: "Security-Memo.pdf",
          excerpt: "encryption gap",
        },
      ],
    });
    expect(deck.slides.some((slide) => slide.kind === "item")).toBe(true);
    const buffer = await exportPptxBuffer({ deck, projectName: "Acme" });
    expect(buffer.byteLength).toBeGreaterThan(5_000);
  });
});
