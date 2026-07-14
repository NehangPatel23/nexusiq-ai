import type { TimelineCategory } from "@prisma/client";

const KEYWORD_RULES: Array<{ category: TimelineCategory; patterns: RegExp[] }> = [
  {
    category: "FUNDING",
    patterns: [
      /\b(series\s+[a-e]|seed\s+round|fundrais|raised\s+\$|venture\s+capital|equity\s+financing|bridge\s+round)\b/i,
    ],
  },
  {
    category: "HIRING",
    patterns: [/\b(hir(ed|ing)|appoint(ed|ment)|joined\s+as|new\s+hire|headcount)\b/i],
  },
  {
    category: "ACQUISITION",
    patterns: [/\b(acqui(red|sition)|merger|merged\s+with|buyout|takeover)\b/i],
  },
  {
    category: "LAWSUIT",
    patterns: [/\b(lawsuit|litigation|sued|settlement|complaint\s+filed|court\s+order)\b/i],
  },
  {
    category: "LEADERSHIP",
    patterns: [/\b(ceo|cfo|cto|board\s+of\s+directors|chairman|promoted\s+to|resigned|stepped\s+down)\b/i],
  },
  {
    category: "REVENUE",
    patterns: [/\b(revenue|arr|mrr|ebitda|profit|ipo|earnings)\b/i],
  },
  {
    category: "CONTRACT",
    patterns: [/\b(contract|agreement|msa|nda|lease|signed\s+with|partnership\s+deal)\b/i],
  },
];

export function classifyTimelineCategory(
  title: string,
  description?: string | null,
): TimelineCategory {
  const text = `${title} ${description ?? ""}`.trim();
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.category;
    }
  }
  return "OTHER";
}
