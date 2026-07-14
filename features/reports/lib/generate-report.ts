import type { Prisma, ReportFormat, ReportType } from "@prisma/client";

import { OllamaUnavailableError } from "@/lib/ai/agents/run-agent";
import type { ChatCitation } from "@/lib/ai/citations";
import { prisma } from "@/lib/db";

import { assembleReportMarkdown, type SlideOutline } from "./assemble";
import { loadIntelligenceContext } from "./context";
import { isNarrativeReportType } from "./labels";
import { generateNarrativeWithOllama } from "./narrative";
import { buildReportSnapshot, type ReportSnapshotAsOf } from "./snapshot";

export type ReportMetadata = {
  citations: ChatCitation[];
  sourceAgentRunIds: string[];
  consensusRunId: string | null;
  insufficientContext?: boolean;
  slideOutline?: SlideOutline;
  formats?: Partial<Record<"md" | "pdf" | "xlsx" | "pptx", string>>;
  /** Bumped when an exporter’s layout changes so stale cached binaries are regenerated. */
  exportVersions?: Partial<Record<"md" | "pdf" | "xlsx" | "pptx", number>>;
  generatedWithOllama?: boolean;
  riskRegisterRows?: import("./assemble-shared").RiskRegisterRow[];
  actionPlanItems?: import("./assemble-shared").ActionPlanItem[];
  /** AgentRun / Consensus pins at generation time (“as of”). */
  snapshotAsOf?: ReportSnapshotAsOf;
};

export type GenerateReportOptions = {
  projectId: string;
  projectName: string;
  organizationId: string;
  userId: string;
  reportType: ReportType;
  title?: string;
  forceRegenerate?: boolean;
  formats?: ReportFormat[];
};

export type GeneratedReportResult = {
  reportId: string;
  title: string;
  reportType: ReportType;
  contentPreview: string;
  status: "completed";
  createdAt: string;
  insufficientContext: boolean;
};

const DEFAULT_TITLES: Record<ReportType, string> = {
  EXECUTIVE: "Executive Report",
  BOARD: "Board Report",
  INVESTMENT_MEMO: "Investment Memo",
  AUDIT: "Audit Report",
  RISK_REGISTER: "Risk Register",
  ACTION_PLAN: "Action Plan",
  PPTX: "Diligence Slide Deck",
};

function needsOllamaNarrative(
  reportType: ReportType,
  forceRegenerate: boolean,
  hasExecutive: boolean,
): boolean {
  if (!isNarrativeReportType(reportType)) return false;
  if (forceRegenerate) return true;
  if (reportType === "EXECUTIVE" || reportType === "BOARD" || reportType === "INVESTMENT_MEMO") {
    return !hasExecutive;
  }
  // AUDIT: Ollama polish is optional — assemble first; only forceRegenerate calls Ollama
  return false;
}

export async function generateReport(
  options: GenerateReportOptions,
): Promise<GeneratedReportResult> {
  const forceRegenerate = Boolean(options.forceRegenerate);
  const ctx = await loadIntelligenceContext(options.projectId, options.projectName);

  if (
    !ctx.hasAnyIntelligence &&
    (options.reportType === "INVESTMENT_MEMO" ||
      options.reportType === "BOARD" ||
      options.reportType === "EXECUTIVE")
  ) {
    // Soft warn path — still allow best-effort; callers may prefer 400.
    // We continue with insufficient context banner rather than hard-failing.
  }

  let assembled = assembleReportMarkdown(options.reportType, ctx);
  let citations = ctx.citations;
  let generatedWithOllama = false;

  if (needsOllamaNarrative(options.reportType, forceRegenerate, ctx.hasExecutive)) {
    try {
      const narrative = await generateNarrativeWithOllama({
        reportType: options.reportType,
        ctx,
      });
      assembled = {
        ...assembled,
        content: `# ${DEFAULT_TITLES[options.reportType]} — ${ctx.projectName}\n\n${narrative.markdown}`,
      };
      citations = narrative.citations.length > 0 ? narrative.citations : citations;
      generatedWithOllama = true;
    } catch (error) {
      if (error instanceof OllamaUnavailableError) {
        throw error;
      }
      throw error;
    }
  }

  const title =
    options.title?.trim() ||
    `${DEFAULT_TITLES[options.reportType]} — ${options.projectName}`;

  const metadata: ReportMetadata = {
    citations,
    sourceAgentRunIds: ctx.sourceAgentRunIds,
    consensusRunId: ctx.consensus?.id ?? null,
    insufficientContext: assembled.insufficient,
    slideOutline: assembled.slideOutline,
    formats: { md: "inline" },
    generatedWithOllama,
    riskRegisterRows: assembled.riskRegisterRows,
    actionPlanItems: assembled.actionPlanItems,
    snapshotAsOf: buildReportSnapshot(ctx),
  };

  const report = await prisma.report.create({
    data: {
      projectId: options.projectId,
      userId: options.userId,
      title,
      reportType: options.reportType,
      content: assembled.content,
      format: "MARKDOWN",
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  if (options.formats && options.formats.length > 0) {
    const { exportReportBinary } = await import("./export-report");
    const { reportFormatToExportKey } = await import("../schemas");
    for (const format of options.formats) {
      if (format === "MARKDOWN") continue;
      try {
        await exportReportBinary({
          reportId: report.id,
          organizationId: options.organizationId,
          format: reportFormatToExportKey(format),
        });
      } catch (error) {
        console.error(`Eager export failed for ${format}:`, error);
      }
    }
  }

  return {
    reportId: report.id,
    title: report.title,
    reportType: report.reportType,
    contentPreview: assembled.content.slice(0, 400),
    status: "completed",
    createdAt: report.createdAt.toISOString(),
    insufficientContext: Boolean(assembled.insufficient),
  };
}
