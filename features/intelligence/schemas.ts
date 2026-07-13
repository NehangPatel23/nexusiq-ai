import { z } from "zod";

import type { AgentType } from "@prisma/client";

export const runAgentBodySchema = z.object({
  force: z.boolean().optional(),
});

export const listAgentRunsQuerySchema = z.object({
  agentType: z.enum(["FINANCIAL", "LEGAL", "COMPLIANCE", "RISK", "FRAUD"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const AGENT_RUN_API_TYPES = [
  "financial",
  "legal",
  "compliance",
  "risk",
  "fraud",
] as const;

export type AgentRunApiType = (typeof AGENT_RUN_API_TYPES)[number];

export const API_TYPE_TO_AGENT: Record<AgentRunApiType, AgentType> = {
  financial: "FINANCIAL",
  legal: "LEGAL",
  compliance: "COMPLIANCE",
  risk: "RISK",
  fraud: "FRAUD",
};

export function agentTypeFromApiSegment(segment: string): AgentType | null {
  if (!(segment in API_TYPE_TO_AGENT)) return null;
  return API_TYPE_TO_AGENT[segment as AgentRunApiType];
}
