import type { ReportType } from "@prisma/client";

import type { SearchResultItem } from "@/features/search/lib/types";
import { OllamaUnavailableError, rethrowOllamaChatFailure } from "@/lib/ai/agents/run-agent";
import type { ChatCitation } from "@/lib/ai/citations";
import { parseAndValidateCitations } from "@/lib/ai/citations";
import {
  getOllamaClient,
  type ChatMessage,
  type OllamaClient,
} from "@/lib/ai/ollama-client";

import { asString, asStringArray } from "./assemble-shared";
import type { IntelligenceContext } from "./context";
import { isNarrativeReportType } from "./labels";

export { isNarrativeReportType };

function reportPromptForType(reportType: ReportType): string {
  switch (reportType) {
    case "EXECUTIVE":
      return "Write an executive diligence report with Summary, Key Findings, Risks, and Recommendations. Cite sources as [doc:documentId:chunk:chunkId] where evidence exists.";
    case "BOARD":
      return "Write a board-ready diligence narrative including risk posture, material findings, and a clear board recommendation. Include a textual risk heatmap summary.";
    case "INVESTMENT_MEMO":
      return "Write an investment memo covering deal thesis, key risks, diligence gaps, and a go / no-go / further diligence recommendation.";
    case "AUDIT":
      return "Polish an audit-oriented report summarizing compliance framework gaps, evidence, and remediation priorities. Do not invent gaps.";
    default:
      return "Write a concise diligence report with citations.";
  }
}

function buildContextSummary(ctx: IntelligenceContext): string {
  const parts: string[] = [`Project: ${ctx.projectName}`];

  for (const [agentType, run] of Object.entries(ctx.agentRuns)) {
    if (!run) continue;
    parts.push(
      [
        `### ${agentType} (score=${run.score ?? "n/a"}, confidence=${run.confidence ?? "n/a"})`,
        asString(run.output?.recommendation) ?? asString(run.output?.executiveSummary) ?? "",
        asString(run.output?.markdown)?.slice(0, 1500) ?? "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (ctx.consensus) {
    parts.push(
      ["### Consensus", ctx.consensus.finalRecommendation, ctx.consensus.resolutionRationale].join(
        "\n",
      ),
    );
  }

  if (ctx.findings.length > 0) {
    parts.push(
      [
        "### Findings",
        ...ctx.findings.slice(0, 30).map((f) => {
          const cite =
            f.documentId && f.sourceChunkId
              ? ` [doc:${f.documentId}:chunk:${f.sourceChunkId}]`
              : "";
          return `- [${f.severity ?? "n/a"}] ${f.title}: ${f.description.slice(0, 160)}${cite}`;
        }),
      ].join("\n"),
    );
  }

  const priorityActions = asStringArray(ctx.agentRuns.EXECUTIVE?.output?.priorityActions);
  if (priorityActions.length > 0) {
    parts.push(`### Priority actions\n${priorityActions.map((a) => `- ${a}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

function citationsToSearchChunks(citations: ChatCitation[]): SearchResultItem[] {
  return citations.map((citation) => ({
    chunkId: citation.chunkId,
    documentId: citation.documentId,
    documentName: citation.documentName || citation.documentId,
    documentType: "OTHER" as const,
    classification: null,
    folderId: null,
    content: citation.excerpt || "",
    snippet: citation.excerpt || "",
    score: 1,
    pageNumber: null,
    sectionTitle: null,
    mode: "hybrid" as const,
  }));
}

export async function generateNarrativeWithOllama(params: {
  reportType: ReportType;
  ctx: IntelligenceContext;
  ollama?: Pick<OllamaClient, "healthCheck" | "chat">;
}): Promise<{ markdown: string; citations: ChatCitation[] }> {
  const ollama = params.ollama ?? getOllamaClient();

  const health = await ollama.healthCheck();
  if (!health.ok) {
    throw new OllamaUnavailableError(
      "Narrative report generation requires Ollama. Run the Executive agent on the Intelligence tab first, or configure OLLAMA_BASE_URL.",
    );
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "You are NexusIQ report writer. Use only the provided diligence context.",
        "Never invent findings, scores, or citations.",
        "If evidence is weak, state gaps explicitly.",
        "Return Markdown only.",
        reportPromptForType(params.reportType),
      ].join(" "),
    },
    {
      role: "user",
      content: `Generate a ${params.reportType} report for ${params.ctx.projectName}.\n\nContext:\n${buildContextSummary(params.ctx)}`,
    },
  ];

  try {
    const result = await ollama.chat(messages, { maxTokens: 4096 });
    const markdown = result.message.content.trim();
    const citations = parseAndValidateCitations(
      markdown,
      citationsToSearchChunks(params.ctx.citations),
    );
    return {
      markdown,
      citations: citations.length > 0 ? citations : params.ctx.citations,
    };
  } catch (error) {
    rethrowOllamaChatFailure(error);
  }
}
