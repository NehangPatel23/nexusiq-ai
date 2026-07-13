import { readFileSync } from "node:fs";
import path from "node:path";

import type { AgentType } from "@prisma/client";

import { AGENT_PROMPT_FILES } from "./types";

function readPrompt(fileName: string): string {
  return readFileSync(path.join(process.cwd(), "prompts", fileName), "utf8");
}

function extractFirstCodeBlock(markdown: string): string {
  const match = markdown.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);
  if (!match?.[1]) {
    throw new Error("Prompt file does not contain a system prompt code block");
  }
  return match[1].trim();
}

function extractRetrievalBias(markdown: string): string {
  const section = markdown.match(/## Retrieval Bias\s*\n([\s\S]*?)(?:\n##|$)/);
  return section?.[1]?.trim() ?? "";
}

export function loadAgentSystemPrompt(agentType: AgentType): string {
  return extractFirstCodeBlock(readPrompt(AGENT_PROMPT_FILES[agentType]));
}

export function agentSeedQuery(agentType: AgentType): string {
  const markdown = readPrompt(AGENT_PROMPT_FILES[agentType]);
  const bias = extractRetrievalBias(markdown);

  const defaults: Record<AgentType, string> = {
    FINANCIAL:
      "financial statements revenue expenses margins cash flow balance sheet invoices payments anomalies concentration",
    LEGAL: "contracts agreements legal clauses litigation lawsuits expiration termination confidentiality liability",
    COMPLIANCE:
      "compliance audit GDPR SOX PCI ISO 27001 HIPAA policy controls remediation framework gaps",
    RISK: "enterprise risk operational financial legal vendor customer cyber supply chain market exposure",
    FRAUD:
      "fraud invoice duplicate vendor ghost suspicious transaction related party expense payroll conflict of interest",
  };

  if (!bias) return defaults[agentType];
  return `${defaults[agentType]} ${bias}`.trim();
}

export function __testables() {
  return { extractFirstCodeBlock, extractRetrievalBias };
}
