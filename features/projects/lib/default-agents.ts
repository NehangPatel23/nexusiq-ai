export const DEFAULT_AGENTS = [
  "financial",
  "legal",
  "compliance",
  "risk",
  "fraud",
  "executive",
] as const;

export type DefaultAgent = (typeof DEFAULT_AGENTS)[number];

export const DEFAULT_AGENT_LABELS: Record<DefaultAgent, string> = {
  financial: "Financial",
  legal: "Legal",
  compliance: "Compliance",
  risk: "Risk",
  fraud: "Fraud",
  executive: "Executive",
};

export function getDefaultAgentFromMetadata(metadata: unknown): DefaultAgent | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).defaultAgent;
  if (typeof value === "string" && DEFAULT_AGENTS.includes(value as DefaultAgent)) {
    return value as DefaultAgent;
  }

  return null;
}
