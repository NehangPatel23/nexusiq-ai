import type { ConfidenceLevel } from "@prisma/client";

import { extractConfidenceLevel, stripConfidenceMarker } from "@/lib/ai/confidence";

export const EXECUTIVE_SECTION_TITLES = [
  "Executive Summary",
  "Key Findings",
  "Risk Heatmap Summary",
  "Financial Assessment",
  "Legal Assessment",
  "Compliance Assessment",
  "Fraud Assessment",
  "Recommendation",
  "Priority Actions",
] as const;

export type ExecutiveSectionTitle = (typeof EXECUTIVE_SECTION_TITLES)[number];

export type ParsedExecutiveSections = {
  markdown: string;
  sections: Partial<Record<ExecutiveSectionTitle | string, string>>;
  executiveSummary: string;
  boardReport?: string;
  investmentMemo?: string;
  recommendation: string;
  acquisitionRecommendation?: string;
  priorityActions: string[];
  confidence: ConfidenceLevel | null;
};

function normalizeHeading(value: string): string {
  return value.replace(/^#+\s*/, "").trim();
}

function extractSectionBodies(markdown: string): Array<{ title: string; body: string }> {
  const lines = markdown.split(/\r?\n/);
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (!currentTitle) return;
    sections.push({ title: currentTitle, body: currentLines.join("\n").trim() });
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentTitle = normalizeHeading(headingMatch[1] ?? "");
      currentLines = [];
      continue;
    }
    if (currentTitle) currentLines.push(line);
  }
  flush();

  return sections;
}

function extractPriorityActions(body: string): string[] {
  const actions: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/);
    if (match?.[1]) {
      const text = match[1].trim();
      if (text) actions.push(text);
    }
  }
  if (actions.length > 0) return actions;

  const compact = body.trim();
  return compact ? [compact] : [];
}

function inferAcquisitionRecommendation(recommendation: string): string | undefined {
  const lower = recommendation.toLowerCase();
  if (/\b(acquire|acquisition|buy)\b/.test(lower)) return "Acquire";
  if (/\bpass\b/.test(lower)) return "Pass";
  if (/\bfurther diligence\b|\badditional diligence\b/.test(lower)) return "Further Diligence";
  if (/\bapprove vendor\b/.test(lower)) return "Approve Vendor";
  if (/\breject vendor\b/.test(lower)) return "Reject Vendor";
  return undefined;
}

/**
 * Split executive Markdown into named sections and normalize priority actions.
 */
export function parseExecutiveMarkdown(rawMarkdown: string): ParsedExecutiveSections {
  const confidence = extractConfidenceLevel(rawMarkdown);
  const markdown = stripConfidenceMarker(rawMarkdown).trim();
  const sectionList = extractSectionBodies(markdown);
  const sections: ParsedExecutiveSections["sections"] = {};

  for (const section of sectionList) {
    sections[section.title] = section.body;
  }

  const executiveSummary =
    sections["Executive Summary"]?.trim() ||
    sections["Summary"]?.trim() ||
    markdown.split(/\n#{2,}\s+/)[0]?.trim() ||
    markdown.slice(0, 600);

  const recommendation =
    sections["Recommendation"]?.trim() ||
    sections["Recommendation (Acquire / Pass / Further Diligence / Approve Vendor / Reject Vendor)"]?.trim() ||
    "Further diligence recommended pending additional evidence.";

  const priorityActions = extractPriorityActions(sections["Priority Actions"] ?? "");
  const boardReport = sections["Board Report"]?.trim() || sections["Risk Heatmap Summary"]?.trim();
  const investmentMemo =
    sections["Investment Memo"]?.trim() ||
    [sections["Financial Assessment"], sections["Legal Assessment"], sections["Compliance Assessment"]]
      .filter(Boolean)
      .join("\n\n")
      .trim() ||
    undefined;

  return {
    markdown,
    sections,
    executiveSummary,
    boardReport: boardReport || undefined,
    investmentMemo: investmentMemo || undefined,
    recommendation,
    acquisitionRecommendation: inferAcquisitionRecommendation(recommendation),
    priorityActions,
    confidence,
  };
}

export function deriveExecutiveCompositeScore(scores: Array<number | null | undefined>): number | null {
  const values = scores.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function __testables() {
  return { extractSectionBodies, extractPriorityActions, inferAcquisitionRecommendation };
}
