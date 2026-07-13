import type { ChatAgentType, DocumentClassification } from "@prisma/client";

import type { SearchFilters } from "@/features/search/lib/types";

const AGENT_CLASSIFICATIONS: Partial<Record<ChatAgentType, DocumentClassification[]>> = {
  FINANCIAL: ["FINANCIAL"],
  LEGAL: ["LEGAL", "CONTRACT"],
  COMPLIANCE: ["COMPLIANCE"],
  RISK: ["OPERATIONAL", "FINANCIAL", "LEGAL"],
  FRAUD: ["FINANCIAL", "OPERATIONAL"],
};

export function retrievalFiltersForAgent(agentType: ChatAgentType): SearchFilters | undefined {
  const classifications = AGENT_CLASSIFICATIONS[agentType];
  if (!classifications?.length) return undefined;
  return { classification: classifications[0] };
}

export function agentRetrievalClassifications(agentType: ChatAgentType): DocumentClassification[] {
  return AGENT_CLASSIFICATIONS[agentType] ?? [];
}
