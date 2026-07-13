import type { ChatAgentType, DocumentClassification } from "@prisma/client";

import { prisma } from "@/lib/db";

import { BASE_SUGGESTED_QUESTIONS, getSuggestedQuestions } from "./suggested-questions";

const CLASSIFICATION_QUESTIONS: Partial<Record<DocumentClassification, string>> = {
  FINANCIAL: "What do the audited financials show about revenue and margins?",
  LEGAL: "Which contract clauses create renewal or liability risk?",
  COMPLIANCE: "What GDPR or SOC 2 gaps appear in compliance files?",
  CONTRACT: "Which material contracts expire in the next 12 months?",
  OPERATIONAL: "What operational risks appear in management reports?",
  HR: "What executive compensation or employment risks are documented?",
  TAX: "Are there tax exposures or deferred tax items called out?",
  CORRESPONDENCE: "What issues appear in board or investor correspondence?",
};

export type ChatProjectContext = {
  readyDocumentCount: number;
  pendingDocumentCount: number;
  classifications: DocumentClassification[];
};

export async function getChatProjectContext(projectId: string): Promise<ChatProjectContext> {
  const [readyDocumentCount, pendingDocumentCount, classificationRows] = await Promise.all([
    prisma.document.count({
      where: { projectId, deletedAt: null, status: "READY" },
    }),
    prisma.document.count({
      where: {
        projectId,
        deletedAt: null,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    }),
    prisma.document.findMany({
      where: { projectId, deletedAt: null, status: "READY", classification: { not: null } },
      select: { classification: true },
      distinct: ["classification"],
    }),
  ]);

  const classifications = classificationRows
    .map((row) => row.classification)
    .filter((value): value is DocumentClassification => value !== null);

  return { readyDocumentCount, pendingDocumentCount, classifications };
}

export function buildContextualSuggestedQuestions(
  agentType: ChatAgentType | undefined,
  context: ChatProjectContext,
): string[] {
  const contextual = context.classifications
    .map((classification) => CLASSIFICATION_QUESTIONS[classification])
    .filter((question): question is string => Boolean(question));

  const base = getSuggestedQuestions(agentType);
  const merged = [...contextual, ...base];
  const unique: string[] = [];
  for (const question of merged) {
    if (!unique.includes(question)) unique.push(question);
  }
  return unique.slice(0, 14);
}

export { BASE_SUGGESTED_QUESTIONS };
