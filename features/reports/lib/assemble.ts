import type { ReportType } from "@prisma/client";

import type { IntelligenceContext } from "./context";
import {
  asString,
  asStringArray,
  buildActionPlanItems,
  buildRiskRegisterRows,
  formatCitationsSection,
  insufficientContextSection,
  missingContextFlags,
  riskRegisterMarkdown,
  actionPlanMarkdown,
  type ActionPlanItem,
  type RiskRegisterRow,
} from "./assemble-shared";

export type AssembledReport = {
  content: string;
  slideOutline?: SlideOutline;
  insufficient: boolean;
  riskRegisterRows?: RiskRegisterRow[];
  actionPlanItems?: ActionPlanItem[];
};

export type SlideOutline = {
  title: string;
  slides: Array<{ heading: string; bullets: string[] }>;
};

function appendCitationsAndGaps(ctx: IntelligenceContext, sections: string[]): string {
  const missing = missingContextFlags(ctx);
  if (missing.length > 0) {
    sections.push(insufficientContextSection(missing));
  }
  sections.push(formatCitationsSection(ctx.citations));
  return sections.filter(Boolean).join("\n\n");
}

function executiveMarkdown(ctx: IntelligenceContext): string {
  const exec = ctx.agentRuns.EXECUTIVE;
  const output = exec?.output ?? null;
  const markdown = asString(output?.markdown);
  const summary = asString(output?.executiveSummary);
  const recommendation = asString(output?.recommendation) ?? asString(output?.acquisitionRecommendation);
  const actions = asStringArray(output?.priorityActions);

  const sections: string[] = [`# Executive Report — ${ctx.projectName}`];

  if (markdown) {
    sections.push(markdown);
  } else if (summary) {
    sections.push(`## Executive Summary\n\n${summary}`);
    if (recommendation) sections.push(`## Recommendation\n\n${recommendation}`);
    if (actions.length > 0) {
      sections.push(`## Priority Actions\n\n${actions.map((a) => `- ${a}`).join("\n")}`);
    }
  } else {
    sections.push(
      "## Executive Summary\n\nNo executive package output was available. Run the Executive agent on the Intelligence tab, or regenerate with narrative generation enabled.",
    );
  }

  if (ctx.consensus) {
    sections.push(
      [
        "## Consensus Recommendation",
        "",
        ctx.consensus.finalRecommendation,
        "",
        `**Decision confidence:** ${ctx.consensus.decisionConfidence}`,
        "",
        "### Resolution rationale",
        "",
        ctx.consensus.resolutionRationale,
      ].join("\n"),
    );
  }

  return appendCitationsAndGaps(ctx, sections);
}

function boardMarkdown(ctx: IntelligenceContext): string {
  const exec = ctx.agentRuns.EXECUTIVE?.output ?? null;
  const risk = ctx.agentRuns.RISK?.output ?? null;
  const boardFromExec = asString(exec?.boardReport);
  const summary = asString(exec?.executiveSummary) ?? asString(exec?.markdown);
  const recommendation =
    asString(exec?.recommendation) ??
    asString(exec?.acquisitionRecommendation) ??
    ctx.consensus?.finalRecommendation ??
    null;

  const sections: string[] = [`# Board Report — ${ctx.projectName}`];

  if (boardFromExec) {
    sections.push(`## Board Narrative\n\n${boardFromExec}`);
  } else if (summary) {
    sections.push(`## Board Narrative\n\n${summary}`);
  } else {
    sections.push(
      "## Board Narrative\n\nInsufficient executive narrative for a full board package. Available scores and findings are summarized below.",
    );
  }

  if (recommendation) {
    sections.push(`## Board Recommendation\n\n${recommendation}`);
  }

  if (ctx.consensus) {
    sections.push(
      [
        "## Consensus Snapshot",
        "",
        `- Final recommendation: ${ctx.consensus.finalRecommendation}`,
        `- Confidence: ${ctx.consensus.decisionConfidence}`,
        `- Conflicts reviewed: ${ctx.consensus.conflicts.length}`,
        `- Agreements: ${ctx.consensus.agreements.length}`,
      ].join("\n"),
    );
  }

  const heatmap =
    (Array.isArray(risk?.riskHeatmap) ? risk?.riskHeatmap : null) ??
    (risk?.categoryScores && typeof risk.categoryScores === "object"
      ? Object.entries(risk.categoryScores as Record<string, number>).map(([category, score]) => ({
          category,
          severity: score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW",
          count: score,
        }))
      : []);

  if (Array.isArray(heatmap) && heatmap.length > 0) {
    const rows = heatmap
      .map((row) => {
        const rec = row as { category?: string; severity?: string; count?: number };
        return `| ${rec.category ?? "—"} | ${rec.severity ?? "—"} | ${rec.count ?? "—"} |`;
      })
      .join("\n");
    sections.push(
      `## Risk Heatmap\n\n| Category | Severity | Count/Score |\n| --- | --- | --- |\n${rows}`,
    );
  }

  const topFindings = ctx.findings.slice(0, 8);
  if (topFindings.length > 0) {
    sections.push(
      [
        "## Material Findings",
        "",
        ...topFindings.map(
          (f) => `- **[${f.severity ?? "n/a"}]** ${f.title} (${f.agentType}) — ${f.description.slice(0, 200)}`,
        ),
      ].join("\n"),
    );
  }

  return appendCitationsAndGaps(ctx, sections);
}

function investmentMemoMarkdown(ctx: IntelligenceContext): string {
  const exec = ctx.agentRuns.EXECUTIVE?.output ?? null;
  const memo = asString(exec?.investmentMemo);
  const summary = asString(exec?.executiveSummary);
  const recommendation =
    asString(exec?.recommendation) ??
    asString(exec?.acquisitionRecommendation) ??
    ctx.consensus?.finalRecommendation;

  const sections: string[] = [`# Investment Memo — ${ctx.projectName}`];

  if (memo) {
    sections.push(`## Deal Thesis\n\n${memo}`);
  } else if (summary) {
    sections.push(`## Deal Thesis\n\n${summary}`);
  } else {
    sections.push(
      "## Deal Thesis\n\nNo investment thesis narrative was available from the executive package.",
    );
  }

  const riskFindings = ctx.findings.filter(
    (f) => f.severity === "CRITICAL" || f.severity === "HIGH",
  );
  sections.push(
    [
      "## Key Risks",
      "",
      riskFindings.length > 0
        ? riskFindings
            .slice(0, 12)
            .map((f) => `- **${f.severity}** ${f.title}: ${f.description.slice(0, 180)}`)
            .join("\n")
        : "- No high/critical findings were available.",
    ].join("\n"),
  );

  sections.push(
    `## Recommendation\n\n${recommendation ?? "Further Diligence — insufficient intelligence context for a firm recommendation."}`,
  );

  if (ctx.consensus) {
    sections.push(
      `## Consensus Rationale\n\n${ctx.consensus.resolutionRationale}`,
    );
  }

  return appendCitationsAndGaps(ctx, sections);
}

function auditMarkdown(ctx: IntelligenceContext): string {
  const compliance = ctx.agentRuns.COMPLIANCE?.output ?? null;
  const risk = ctx.agentRuns.RISK?.output ?? null;
  const gaps = Array.isArray(compliance?.frameworkGaps) ? compliance.frameworkGaps : [];

  const sections: string[] = [`# Audit Report — ${ctx.projectName}`];

  const readiness = typeof compliance?.auditReadinessScore === "number"
    ? compliance.auditReadinessScore
    : null;
  if (readiness !== null) {
    sections.push(`## Audit Readiness\n\nScore: **${readiness}**`);
  }

  if (gaps.length > 0) {
    const rows = gaps
      .map((gap) => {
        const g = gap as {
          framework?: string;
          requirement?: string;
          status?: string;
          evidence?: string;
          remediation?: string;
        };
        return `| ${g.framework ?? "—"} | ${g.requirement ?? "—"} | ${g.status ?? "—"} | ${(g.remediation ?? "—").replace(/\|/g, "/")} |`;
      })
      .join("\n");
    sections.push(
      `## Framework Gaps\n\n| Framework | Requirement | Status | Remediation |\n| --- | --- | --- | --- |\n${rows}`,
    );

    const remediation = gaps
      .map((gap) => {
        const g = gap as { framework?: string; requirement?: string; remediation?: string };
        if (!g.remediation) return null;
        return `- **${g.framework ?? "Framework"} / ${g.requirement ?? "Requirement"}:** ${g.remediation}`;
      })
      .filter(Boolean);
    if (remediation.length > 0) {
      sections.push(`## Remediation Plan\n\n${remediation.join("\n")}`);
    }
  } else {
    sections.push(
      "## Framework Gaps\n\nNo structured compliance framework gaps were available from the Compliance agent.",
    );
  }

  const evidenceFindings = ctx.findings.filter((f) => f.agentType === "COMPLIANCE" || f.agentType === "RISK");
  if (evidenceFindings.length > 0) {
    sections.push(
      [
        "## Evidence & Findings",
        "",
        ...evidenceFindings.slice(0, 20).map((f) => {
          const cite =
            f.documentId && f.sourceChunkId
              ? ` (doc:${f.documentId}, chunk:${f.sourceChunkId})`
              : "";
          return `- **${f.title}** [${f.severity ?? "n/a"}]${cite}: ${f.description.slice(0, 200)}`;
        }),
      ].join("\n"),
    );
  }

  if (typeof risk?.enterpriseRiskScore === "number") {
    sections.push(`## Enterprise Risk Score\n\n**${risk.enterpriseRiskScore}**`);
  }

  return appendCitationsAndGaps(ctx, sections);
}

function assembleActionPlan(ctx: IntelligenceContext): AssembledReport {
  const exec = ctx.agentRuns.EXECUTIVE?.output ?? null;
  const priorityActions = asStringArray(exec?.priorityActions);
  const items = buildActionPlanItems(ctx.findings, priorityActions, ctx.citations);
  const missing = missingContextFlags(ctx);
  const sections = [actionPlanMarkdown(items, ctx.projectName)];
  return {
    content: appendCitationsAndGaps(ctx, sections),
    insufficient: missing.length > 0,
    actionPlanItems: items,
  };
}

function buildSlideOutline(ctx: IntelligenceContext): SlideOutline {
  const exec = ctx.agentRuns.EXECUTIVE?.output ?? null;
  const recommendation =
    asString(exec?.recommendation) ??
    asString(exec?.acquisitionRecommendation) ??
    ctx.consensus?.finalRecommendation ??
    "Further Diligence";

  const scores = (["FINANCIAL", "LEGAL", "COMPLIANCE", "RISK", "FRAUD"] as const)
    .map((type) => {
      const run = ctx.agentRuns[type];
      return run ? `${type}: ${run.score ?? "n/a"}` : null;
    })
    .filter((item): item is string => Boolean(item));

  const topFindings = ctx.findings
    .slice(0, 8)
    .map((f) => `[${f.severity ?? "n/a"}] ${f.title}${f.description ? ` — ${f.description.slice(0, 100)}` : ""}`);

  const priorityActions = asStringArray(exec?.priorityActions);

  return {
    title: `${ctx.projectName} — Diligence Summary`,
    slides: [
      {
        heading: "Executive Summary",
        bullets: [
          asString(exec?.executiveSummary)?.slice(0, 360) ??
            "Executive narrative not yet available.",
          `Recommendation: ${recommendation}`,
          ctx.consensus
            ? `Consensus confidence: ${ctx.consensus.decisionConfidence}`
            : "Consensus not yet run",
        ],
      },
      {
        heading: "Agent Scores",
        bullets: scores.length > 0 ? scores : ["No specialist scores available"],
      },
      {
        heading: "Key Findings",
        bullets: topFindings.length > 0 ? topFindings : ["No open findings"],
      },
      {
        heading: "Consensus Recommendation",
        bullets: [
          recommendation,
          ctx.consensus?.resolutionRationale.slice(0, 360) ??
            "Run consensus for resolution rationale.",
        ],
      },
      {
        heading: "Priority Next Steps",
        bullets:
          priorityActions.length > 0
            ? priorityActions.slice(0, 6)
            : topFindings.slice(0, 5).map((item) => item.replace(/\s+—.*$/, "")),
      },
    ],
  };
}

function pptxMarkdown(ctx: IntelligenceContext, outline: SlideOutline): string {
  const sections = [
    `# Slide Deck Outline — ${ctx.projectName}`,
    "",
    ...outline.slides.flatMap((slide, index) => [
      `## Slide ${index + 1}: ${slide.heading}`,
      "",
      ...slide.bullets.map((b) => `- ${b}`),
      "",
    ]),
  ];
  return appendCitationsAndGaps(ctx, sections);
}

export function assembleReportMarkdown(
  reportType: ReportType,
  ctx: IntelligenceContext,
): AssembledReport {
  const missing = missingContextFlags(ctx);
  const insufficient = missing.length > 0;

  switch (reportType) {
    case "EXECUTIVE":
      return { content: executiveMarkdown(ctx), insufficient };
    case "BOARD":
      return { content: boardMarkdown(ctx), insufficient };
    case "INVESTMENT_MEMO":
      return { content: investmentMemoMarkdown(ctx), insufficient };
    case "AUDIT":
      return { content: auditMarkdown(ctx), insufficient };
    case "RISK_REGISTER": {
      const rows = buildRiskRegisterRows(ctx.findings, ctx.citations);
      return {
        content: [
          riskRegisterMarkdown(rows, ctx.projectName),
          insufficient ? `\n\n${insufficientContextSection(missing)}` : "",
          `\n\n${formatCitationsSection(ctx.citations)}`,
        ]
          .filter(Boolean)
          .join(""),
        insufficient,
        riskRegisterRows: rows,
      };
    }
    case "ACTION_PLAN":
      return assembleActionPlan(ctx);
    case "PPTX": {
      const slideOutline = buildSlideOutline(ctx);
      return { content: pptxMarkdown(ctx, slideOutline), slideOutline, insufficient };
    }
    default:
      return { content: executiveMarkdown(ctx), insufficient };
  }
}

export { buildRiskRegisterRows, riskRegisterMarkdown };
