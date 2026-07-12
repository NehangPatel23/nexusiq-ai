import type { DocumentClassification } from "@prisma/client";

import { DOCUMENT_CLASSIFICATIONS } from "@/features/data-room/lib/classifications";
import { getOllamaClient, type OllamaClient } from "../ollama-client";

const CLASSIFICATION_SET = new Set<string>(DOCUMENT_CLASSIFICATIONS);

export function normalizeClassification(value: string): DocumentClassification {
  const upper = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (CLASSIFICATION_SET.has(upper)) {
    return upper as DocumentClassification;
  }
  return "OTHER";
}

export function classifyFromKeywords(text: string): DocumentClassification {
  const sample = text.slice(0, 4000).toLowerCase();
  const rules: Array<{ labels: DocumentClassification; patterns: RegExp[] }> = [
    { labels: "FINANCIAL", patterns: [/revenue/, /balance sheet/, /income statement/, /ebitda/, /financial statement/] },
    { labels: "LEGAL", patterns: [/indemnif/, /liability/, /governing law/, /legal opinion/] },
    { labels: "TAX", patterns: [/tax return/, /irs/, /withholding/, /vat/, /taxable/] },
    { labels: "HR", patterns: [/employee/, /payroll/, /benefits/, /human resources/] },
    { labels: "COMPLIANCE", patterns: [/gdpr/, /sox/, /pci/, /compliance/, /audit trail/] },
    { labels: "CONTRACT", patterns: [/agreement/, /contract/, /terms and conditions/, /master service/] },
    { labels: "CORRESPONDENCE", patterns: [/dear /, /sincerely/, /email/, /memo to/] },
    { labels: "OPERATIONAL", patterns: [/operations/, /process/, /workflow/, /standard operating/] },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(sample))) {
      return rule.labels;
    }
  }
  return "OTHER";
}

export async function classifyDocument(
  text: string,
  client?: OllamaClient,
): Promise<DocumentClassification> {
  const sample = text.slice(0, 6000).trim();
  if (!sample) return "OTHER";

  const ollama = client ?? getOllamaClient();

  try {
    const raw = await ollama.chat(
      [
        {
          role: "system",
          content:
            'Classify the document into exactly one label: financial, legal, tax, hr, operational, compliance, contract, correspondence, other. Respond with JSON only: {"classification":"<label>"}',
        },
        { role: "user", content: sample },
      ],
      { format: "json" },
    );

    const parsed = JSON.parse(raw) as { classification?: string };
    if (parsed.classification) {
      return normalizeClassification(parsed.classification);
    }
  } catch {
    // fall through to keyword heuristic
  }

  return classifyFromKeywords(sample);
}
