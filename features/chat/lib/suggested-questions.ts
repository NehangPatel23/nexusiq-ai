import type { ChatAgentType } from "@prisma/client";

export const BASE_SUGGESTED_QUESTIONS = [
  "Biggest legal risk?",
  "Contracts expiring next year?",
  "Customer concentration?",
  "What is Helix Analytics' ARR and revenue trend?",
  "Summarize GDPR and SOC 2 compliance gaps.",
  "Which customers represent the largest revenue share?",
  "Are there related-party transactions in board minutes?",
  "What does the AWS contract renewal timeline look like?",
  "What financial inconsistencies exist across documents?",
  "What is headcount and executive compensation risk?",
  "How does AR aging compare to the management narrative?",
  "What churn risks appear in commercial data?",
] as const;

const SPECIALIST_QUESTION: Partial<Record<ChatAgentType, string>> = {
  FINANCIAL: "What financial trend needs the most attention?",
  LEGAL: "Which contract clauses create the most exposure?",
  COMPLIANCE: "Which compliance controls lack evidence?",
  RISK: "What are the highest-impact enterprise risks?",
  FRAUD: "Are there documented fraud indicators?",
};

export function getSuggestedQuestions(agentType?: ChatAgentType): string[] {
  const specialist = agentType ? SPECIALIST_QUESTION[agentType] : undefined;
  if (!specialist) return [...BASE_SUGGESTED_QUESTIONS];
  return [specialist, ...BASE_SUGGESTED_QUESTIONS.filter((question) => question !== specialist)];
}
