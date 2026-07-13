import type { ConfidenceLevel } from "@prisma/client";

import type { ChatCitation } from "@/lib/ai/citations";

const CONFIDENCE_PATTERN = /\s*CONFIDENCE:\s*(HIGH|MEDIUM|LOW|INSUFFICIENT)\b/gi;

export type ParsedConfidence = {
  confidence: ConfidenceLevel;
  content: string;
  score: number;
  reason?: string;
};

export function extractConfidenceLevel(content: string): ConfidenceLevel | null {
  const matches = [...content.matchAll(CONFIDENCE_PATTERN)];
  const last = matches.at(-1)?.[1];
  return last ? (last.toUpperCase() as ConfidenceLevel) : null;
}

export function stripConfidenceMarker(content: string): string {
  CONFIDENCE_PATTERN.lastIndex = 0;
  return content.replace(CONFIDENCE_PATTERN, "").trim();
}

const BASE_SCORES: Record<ConfidenceLevel, number> = {
  HIGH: 88,
  MEDIUM: 72,
  LOW: 48,
  INSUFFICIENT: 12,
};

function computeScore(
  confidence: ConfidenceLevel,
  citationCount: number,
  retrievalCount: number,
): number {
  const base = BASE_SCORES[confidence];
  const citationBoost = Math.min(citationCount * 4, 12);
  const coverage = Math.min(citationCount / Math.max(retrievalCount, 1), 1);
  return Math.min(98, Math.round(base * 0.82 + citationBoost + coverage * 6));
}

export function parseConfidence(
  content: string,
  citations: ChatCitation[],
  options?: { retrievalCount?: number },
): ParsedConfidence {
  const matches = [...content.matchAll(CONFIDENCE_PATTERN)];
  const modelLevel = matches.at(-1)?.[1]?.toUpperCase() as ConfidenceLevel | undefined;
  const cleanContent = stripConfidenceMarker(content);
  const citationCount = citations.length;
  const retrievalCount =
    options?.retrievalCount ?? (citationCount > 0 ? Math.max(citationCount, 1) : 0);

  if (retrievalCount === 0) {
    return {
      confidence: "INSUFFICIENT",
      content: cleanContent,
      score: 0,
      reason: "No relevant documents were retrieved from the data room.",
    };
  }

  if (citationCount === 0) {
    return {
      confidence: "INSUFFICIENT",
      content: cleanContent,
      score: 18,
      reason:
        "The answer did not cite any retrieved sources. Responses must reference Source N or [doc:id:chunk:id] markers.",
    };
  }

  let confidence: ConfidenceLevel = modelLevel ?? "MEDIUM";
  if (confidence === "INSUFFICIENT") {
    confidence = citationCount >= 2 ? "MEDIUM" : "LOW";
  }

  const score = computeScore(confidence, citationCount, retrievalCount);
  const reason =
    confidence === "LOW"
      ? "Evidence is thin or only partially supports the answer."
      : undefined;

  return { confidence, content: cleanContent, score, reason };
}

export function scoreFromConfidenceLevel(
  confidence: ConfidenceLevel,
  citationCount = 0,
): number {
  return computeScore(confidence, citationCount, Math.max(citationCount, 1));
}
