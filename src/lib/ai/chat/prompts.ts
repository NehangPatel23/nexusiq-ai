import { readFileSync } from "node:fs";
import path from "node:path";

import type { ChatAgentType } from "@prisma/client";

const SPECIALIST_PROMPTS: Partial<Record<ChatAgentType, string>> = {
  FINANCIAL: "financial.md",
  LEGAL: "legal.md",
  COMPLIANCE: "compliance.md",
  RISK: "risk.md",
  FRAUD: "fraud.md",
};

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

function specialistFraming(agentType: ChatAgentType): string {
  const fileName = SPECIALIST_PROMPTS[agentType];
  if (!fileName) return "";
  const specialistPrompt = extractFirstCodeBlock(readPrompt(fileName));
  return specialistPrompt.split("\n").find((line) => line.trim())?.trim() ?? "";
}

export function buildChatSystemPrompt(agentType: ChatAgentType): string {
  const base = extractFirstCodeBlock(readPrompt("chat.md")).replace(
    "{agent_type}",
    agentType.toLowerCase(),
  );
  const framing = specialistFraming(agentType);

  return framing
    ? `${framing}\nUse this specialist lens while following all chat rules below.\n\n${base}`
    : base;
}

export function __testables() {
  return { extractFirstCodeBlock };
}
