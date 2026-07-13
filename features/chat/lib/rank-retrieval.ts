import type { ChatAgentType } from "@prisma/client";

import type { SearchResponse, SearchResultItem } from "@/features/search/lib/types";
import { agentRetrievalClassifications } from "@/features/chat/lib/agent-retrieval";

function classificationBoost(
  chunk: SearchResultItem,
  preferred: ReturnType<typeof agentRetrievalClassifications>,
): number {
  if (!preferred.length || !chunk.classification) return 0;
  const index = preferred.indexOf(chunk.classification);
  return index === -1 ? 0 : preferred.length - index;
}

export function rankRetrievalForAgent(
  retrieval: SearchResponse,
  agentType: ChatAgentType,
  limit = 10,
): SearchResponse {
  const preferred = agentRetrievalClassifications(agentType);
  if (!preferred.length) {
    return {
      ...retrieval,
      results: retrieval.results.slice(0, limit),
    };
  }

  const ranked = [...retrieval.results].sort((left, right) => {
    const boostDelta = classificationBoost(right, preferred) - classificationBoost(left, preferred);
    if (boostDelta !== 0) return boostDelta;
    return right.score - left.score;
  });

  return {
    ...retrieval,
    results: ranked.slice(0, limit),
  };
}
