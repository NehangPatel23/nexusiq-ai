import { z } from "zod";

import type { AgentType } from "@prisma/client";

export const runAgentBodySchema = z.object({
  force: z.boolean().optional(),
});

export const runConsensusBodySchema = z.object({
  force: z.boolean().optional(),
  agentRunIds: z.array(z.string().uuid()).optional(),
});

export const listAgentRunsQuerySchema = z.object({
  agentType: z
    .enum(["FINANCIAL", "LEGAL", "COMPLIANCE", "RISK", "FRAUD", "EXECUTIVE"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const listConsensusRunsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const AGENT_RUN_API_TYPES = [
  "financial",
  "legal",
  "compliance",
  "risk",
  "fraud",
  "executive",
] as const;

export type AgentRunApiType = (typeof AGENT_RUN_API_TYPES)[number];

export const API_TYPE_TO_AGENT: Record<AgentRunApiType, AgentType> = {
  financial: "FINANCIAL",
  legal: "LEGAL",
  compliance: "COMPLIANCE",
  risk: "RISK",
  fraud: "FRAUD",
  executive: "EXECUTIVE",
};

export function agentTypeFromApiSegment(segment: string): AgentType | null {
  if (!(segment in API_TYPE_TO_AGENT)) return null;
  return API_TYPE_TO_AGENT[segment as AgentRunApiType];
}
