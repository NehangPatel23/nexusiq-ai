import type { ReportType } from "@prisma/client";

import type { ChatCitation } from "@/lib/ai/citations";

import type { SlideOutline } from "./assemble";
import type { ActionPlanItem, RiskRegisterRow } from "./assemble-shared";
import { humanizeLabel } from "./assemble-shared";
import { REPORT_TYPE_LABELS } from "./labels";

export type DeckScore = {
  label: string;
  score: number | null;
};

export type DeckSlide =
  | {
      kind: "section";
      title: string;
      subtitle?: string;
    }
  | {
      kind: "bullets";
      heading: string;
      bullets: string[];
      footnote?: string;
    }
  | {
      kind: "scores";
      heading: string;
      scores: DeckScore[];
      footnote?: string;
    }
  | {
      kind: "callout";
      heading: string;
      body: string;
      detail?: string;
    }
  | {
      kind: "item";
      heading: string;
      eyebrow?: string;
      severity?: string;
      meta: string[];
      context?: string;
      howToClose?: string;
    };

export type DeckModel = {
  title: string;
  projectName: string;
  reportLabel: string;
  generatedAt: string;
  slides: DeckSlide[];
};

export type BuildDeckInput = {
  title: string;
  projectName: string;
  reportType: ReportType;
  content: string;
  citations?: ChatCitation[];
  slideOutline?: SlideOutline | null;
  riskRegisterRows?: RiskRegisterRow[] | null;
  actionPlanItems?: ActionPlanItem[] | null;
  generatedAt?: string;
};

function severityRank(severity: string | undefined): number {
  switch ((severity ?? "").toUpperCase()) {
    case "CRITICAL":
      return 0;
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 3;
    default:
      return 4;
  }
}

function countBySeverity(items: Array<{ severity?: string }>): string {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, OTHER: 0 };
  for (const item of items) {
    const key = (item.severity ?? "").toUpperCase();
    if (key === "CRITICAL" || key === "HIGH" || key === "MEDIUM" || key === "LOW") {
      counts[key] += 1;
    } else {
      counts.OTHER += 1;
    }
  }
  return [
    counts.CRITICAL ? `${counts.CRITICAL} critical` : null,
    counts.HIGH ? `${counts.HIGH} high` : null,
    counts.MEDIUM ? `${counts.MEDIUM} medium` : null,
    counts.LOW ? `${counts.LOW} low` : null,
    counts.OTHER ? `${counts.OTHER} other` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function citationsSlide(citations: ChatCitation[]): DeckSlide | null {
  if (citations.length === 0) return null;
  return {
    kind: "bullets",
    heading: "Source evidence",
    bullets: citations.slice(0, 10).map((citation, index) => {
      const name = citation.documentName || citation.documentId;
      const excerpt = citation.excerpt ? ` — “${citation.excerpt.slice(0, 90)}”` : "";
      return `${index + 1}. ${name}${excerpt}`;
    }),
    footnote:
      citations.length > 10
        ? `Showing 10 of ${citations.length} citations. Full list is in the PDF/Markdown export.`
        : undefined,
  };
}

function actionPlanDeck(input: BuildDeckInput, items: ActionPlanItem[]): DeckSlide[] {
  const slides: DeckSlide[] = [
    {
      kind: "section",
      title: "Action Plan",
      subtitle: `${items.length} prioritized steps for ${input.projectName}`,
    },
    {
      kind: "bullets",
      heading: "Plan overview",
      bullets: [
        `${items.length} action item${items.length === 1 ? "" : "s"} assembled from executive priorities and open findings`,
        countBySeverity(items) || "No severity mix available",
        "Work top-down. Confirm evidence, assign owners, and track close-out notes.",
      ],
    },
  ];

  for (const item of items.slice(0, 14)) {
    slides.push({
      kind: "item",
      eyebrow: item.priority,
      heading: item.action,
      severity: String(item.severity),
      meta: [
        `Source: ${item.source}`,
        item.category ? `Category: ${item.category}` : null,
        item.citationIndex != null ? `Citation: [${item.citationIndex}]` : null,
      ].filter((value): value is string => Boolean(value)),
      context: item.detail || undefined,
      howToClose: item.remediation || undefined,
    });
  }

  if (items.length > 14) {
    slides.push({
      kind: "bullets",
      heading: "Additional actions",
      bullets: items.slice(14, 24).map((item) => `${item.priority} · ${item.action}`),
      footnote: items.length > 24 ? `${items.length - 24} more in the full report.` : undefined,
    });
  }

  return slides;
}

function riskRegisterDeck(input: BuildDeckInput, rows: RiskRegisterRow[]): DeckSlide[] {
  const ordered = [...rows].sort(
    (a, b) => severityRank(String(a.severity)) - severityRank(String(b.severity)),
  );
  const slides: DeckSlide[] = [
    {
      kind: "section",
      title: "Risk Register",
      subtitle: `${rows.length} open findings for ${input.projectName}`,
    },
    {
      kind: "bullets",
      heading: "Risk overview",
      bullets: [
        `${rows.length} open finding${rows.length === 1 ? "" : "s"}`,
        countBySeverity(rows.map((row) => ({ severity: String(row.severity) }))) ||
          "No severity mix available",
        "Each slide includes context and suggested close-out guidance for diligence owners.",
      ],
    },
  ];

  for (const row of ordered.slice(0, 12)) {
    slides.push({
      kind: "item",
      heading: row.title,
      severity: String(row.severity),
      meta: [
        `Category: ${row.category}`,
        `Agent: ${row.agent}`,
        `Status: ${row.status}`,
        row.citation && row.citation !== "—" ? `Evidence: ${row.citation}` : "Evidence: none linked",
      ],
      context: row.description || undefined,
      howToClose: row.remediation || undefined,
    });
  }

  if (ordered.length > 12) {
    slides.push({
      kind: "bullets",
      heading: "Additional findings",
      bullets: ordered
        .slice(12, 24)
        .map((row) => `[${row.severity}] ${row.title} · ${row.category}`),
      footnote:
        ordered.length > 24 ? `${ordered.length - 24} more in Excel / PDF export.` : undefined,
    });
  }

  return slides;
}

function parseActionItemsFromContent(content: string): ActionPlanItem[] {
  const items: ActionPlanItem[] = [];
  for (const line of content.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (line.includes("---") || /priority/i.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 4) continue;
    const [priority, action, source, severity] = cells;
    if (!action || action.includes("No prioritized actions")) continue;
    const [titlePart, ...rest] = action.split(" — ");
    items.push({
      id: `${priority}-${items.length}`,
      priority: priority || `A${items.length + 1}`,
      action: titlePart?.trim() || action,
      detail: rest.join(" — ").trim(),
      source: humanizeLabel(source ?? ""),
      severity: (severity as ActionPlanItem["severity"]) || "UNKNOWN",
      citationIndex: null,
      documentId: null,
      chunkId: null,
      remediation:
        "Assign an owner, set a target date, confirm evidence in the data room, and mark complete when the diligence condition is cleared.",
    });
  }
  return items;
}

function parseRiskRowsFromContent(content: string): RiskRegisterRow[] {
  const rows: RiskRegisterRow[] = [];
  for (const line of content.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (line.includes("---") || /severity/i.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 6) continue;
    const [severity, category, agent, title, citation, status] = cells;
    if (!title || title === "No open findings") continue;
    rows.push({
      severity: (severity as RiskRegisterRow["severity"]) || "UNKNOWN",
      category: humanizeLabel(category ?? ""),
      agent: humanizeLabel(agent ?? ""),
      title,
      description: "",
      citation: citation ?? "—",
      citationIndex: null,
      documentId: null,
      chunkId: null,
      status: humanizeLabel(status ?? "OPEN"),
      score: null,
      remediation:
        "Confirm the cited evidence, assign an owner and due date, document remediation, then update status when residual risk is agreed.",
    });
  }
  return rows;
}

function outlineDeck(outline: SlideOutline): DeckSlide[] {
  return outline.slides.map((slide) => {
    if (/agent scores/i.test(slide.heading)) {
      return {
        kind: "scores" as const,
        heading: slide.heading,
        scores: slide.bullets.map((bullet) => {
          const [label, rest] = bullet.split(":");
          const raw = rest?.trim() ?? "";
          const score = raw.toLowerCase() === "n/a" || raw === "" ? null : Number(raw);
          return {
            label: humanizeLabel(label?.trim() || "Score"),
            score: Number.isFinite(score) ? score : null,
          };
        }),
      };
    }

    if (/recommend|decision|consensus/i.test(slide.heading) && slide.bullets[0]) {
      return {
        kind: "callout" as const,
        heading: slide.heading,
        body: slide.bullets[0],
        detail: slide.bullets.slice(1).join(" "),
      };
    }

    return {
      kind: "bullets" as const,
      heading: slide.heading,
      bullets: slide.bullets,
    };
  });
}

function narrativeFallbackDeck(content: string): DeckSlide[] {
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1]!.trim());
  const slides: DeckSlide[] = [
    {
      kind: "section",
      title: "Report highlights",
      subtitle: "Assembled from the generated markdown body",
    },
  ];

  if (headings.length > 0) {
    slides.push({
      kind: "bullets",
      heading: "Sections",
      bullets: headings.slice(0, 10),
    });
  }

  const paragraphs = content
    .split(/\n{2,}/)
    .map((chunk) =>
      chunk
        .replace(/^#+\s+/gm, "")
        .replace(/^[-*]\s+/gm, "")
        .replace(/\*\*/g, "")
        .replace(/\n+/g, " ")
        .trim(),
    )
    .filter((chunk) => chunk.length > 40 && !chunk.startsWith("|"));

  for (const paragraph of paragraphs.slice(0, 6)) {
    slides.push({
      kind: "bullets",
      heading: "Key narrative",
      bullets: [paragraph.slice(0, 320)],
    });
  }

  return slides;
}

/** Build a presentation deck from report metadata / outline / body. */
export function buildDeckFromReport(input: BuildDeckInput): DeckModel {
  const citations = input.citations ?? [];
  let slides: DeckSlide[] = [];

  if (input.reportType === "ACTION_PLAN") {
    const items =
      input.actionPlanItems && input.actionPlanItems.length > 0
        ? input.actionPlanItems
        : parseActionItemsFromContent(input.content);
    if (items.length > 0) slides = actionPlanDeck(input, items);
  } else if (input.reportType === "RISK_REGISTER") {
    const rows =
      input.riskRegisterRows && input.riskRegisterRows.length > 0
        ? input.riskRegisterRows
        : parseRiskRowsFromContent(input.content);
    if (rows.length > 0) slides = riskRegisterDeck(input, rows);
  }

  if (slides.length === 0 && input.slideOutline?.slides.length) {
    slides = [
      {
        kind: "section",
        title: REPORT_TYPE_LABELS[input.reportType] || "Diligence deck",
        subtitle: input.projectName,
      },
      ...outlineDeck(input.slideOutline),
    ];
  }

  if (slides.length === 0) {
    slides = narrativeFallbackDeck(input.content);
  }

  const citation = citationsSlide(citations);
  if (citation) slides.push(citation);

  slides.push({
    kind: "section",
    title: "End of deck",
    subtitle: "NexusIQ-AI · Confidential diligence export",
  });

  return {
    title: input.title,
    projectName: input.projectName,
    reportLabel: REPORT_TYPE_LABELS[input.reportType] ?? "Report",
    generatedAt: input.generatedAt ?? new Date().toLocaleString(),
    slides,
  };
}
