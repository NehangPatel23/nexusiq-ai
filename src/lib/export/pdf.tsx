import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { ChatCitation } from "@/lib/ai/citations";

/** Current PDF layout version — bump when binary output shape changes. */
export const REPORT_PDF_EXPORTER_VERSION = 5;

const COLORS = {
  ink: "#0f172a",
  muted: "#475569",
  soft: "#64748b",
  line: "#e2e8f0",
  surface: "#f8fafc",
  accent: "#2563eb",
  accentSoft: "#dbeafe",
  footer: "#94a3b8",
  okBg: "#ecfdf5",
  okInk: "#047857",
  okBorder: "#a7f3d0",
  dangerInk: "#b91c1c",
  warnInk: "#b45309",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 52,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.ink,
    lineHeight: 1.4,
    backgroundColor: "#ffffff",
  },
  coverPage: {
    paddingTop: 72,
    paddingBottom: 52,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    color: COLORS.ink,
    backgroundColor: "#ffffff",
  },
  brandEyebrow: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.accent,
    marginBottom: 14,
    fontFamily: "Helvetica-Bold",
  },
  coverTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginBottom: 10,
    lineHeight: 1.25,
  },
  coverSub: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 24,
    lineHeight: 1.45,
  },
  coverMetaRow: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 5,
  },
  accentBar: {
    height: 3,
    width: 64,
    backgroundColor: COLORS.accent,
    marginBottom: 18,
  },
  title: {
    fontSize: 15,
    marginBottom: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  h2: {
    fontSize: 12,
    marginTop: 12,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  h3: {
    fontSize: 11,
    marginTop: 8,
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  paragraph: {
    marginBottom: 5,
    color: COLORS.ink,
  },
  bullet: {
    marginBottom: 3,
    paddingLeft: 6,
    color: COLORS.ink,
  },
  callout: {
    marginVertical: 10,
    padding: 8,
    backgroundColor: COLORS.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  calloutEyebrow: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: COLORS.accent,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  calloutText: {
    fontSize: 10,
    color: COLORS.ink,
    lineHeight: 1.45,
  },
  narrativeBox: {
    marginVertical: 8,
    padding: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  narrativeLabel: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: COLORS.soft,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    fontSize: 8,
    color: COLORS.footer,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 6,
  },
  card: {
    marginTop: 6,
    marginBottom: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: "#ffffff",
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginBottom: 4,
    lineHeight: 1.3,
  },
  metaLine: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 4,
    lineHeight: 1.35,
  },
  severityHigh: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dangerInk,
    marginBottom: 4,
  },
  severityMed: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.warnInk,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 2,
  },
  sectionBody: {
    fontSize: 9,
    color: COLORS.ink,
    lineHeight: 1.35,
    marginBottom: 2,
  },
  closeLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.okInk,
    marginTop: 4,
    marginBottom: 2,
  },
  closeBody: {
    fontSize: 9,
    color: COLORS.ink,
    lineHeight: 1.35,
    padding: 6,
    backgroundColor: COLORS.okBg,
    borderWidth: 1,
    borderColor: COLORS.okBorder,
  },
  footnote: {
    fontSize: 8,
    color: COLORS.soft,
    marginBottom: 2,
    lineHeight: 1.3,
  },
  footnoteBox: {
    marginTop: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
});

export type InlineSpan = { text: string; bold?: boolean; italic?: boolean };

type FindingCard = {
  type: "card";
  title: string;
  severity?: string;
  category?: string;
  agent?: string;
  status?: string;
  source?: string;
  citation?: string;
  score?: string;
  context?: string;
  howToClose?: string;
};

type CalloutBlock = { type: "callout"; label: string; text: string };
type NarrativeBlock = { type: "narrative"; label: string; lines: string[] };

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string }
  | FindingCard
  | CalloutBlock
  | NarrativeBlock;

function isHighlightHeading(title: string): boolean {
  return /recommendation|executive summary|^summary$|decision|board ask|investment thesis|deal thesis/i.test(
    title,
  );
}

function isKeyListHeading(title: string): boolean {
  return /key findings|key risks|risks|priorities|next steps|actions/i.test(title);
}

function softBreakLongTokens(text: string): string {
  return text.replace(/([^\s]{24})/g, "$1\u200B");
}

function cleanControlChars(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

/** Remove leftover markdown emphasis markers that failed to parse. */
export function stripOrphanMarkers(text: string): string {
  return text.replace(/\*\*/g, "").replace(/__/g, "").replace(/`/g, "");
}

/** Prevent Yoga layout blowups from unbroken tokens / control chars. */
export function sanitizePdfText(text: string, maxLength = 1200): string {
  return softBreakLongTokens(stripOrphanMarkers(cleanControlChars(text))).slice(0, maxLength);
}

/** Parse **bold**, *italic*, `code`, and [label](url) into styled spans. */
export function parseInlineMarkdown(input: string, maxLength = 1200): InlineSpan[] {
  const cleaned = cleanControlChars(input).slice(0, maxLength);
  const spans: InlineSpan[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned)) !== null) {
    if (match.index > last) {
      spans.push({ text: softBreakLongTokens(stripOrphanMarkers(cleaned.slice(last, match.index))) });
    }
    if (match[2]) spans.push({ text: softBreakLongTokens(match[2]), bold: true });
    else if (match[3]) spans.push({ text: softBreakLongTokens(match[3]), italic: true });
    else if (match[4]) spans.push({ text: softBreakLongTokens(match[4]) });
    else if (match[5]) spans.push({ text: softBreakLongTokens(match[5]), bold: true });
    last = match.index + match[0].length;
  }
  if (last < cleaned.length) {
    spans.push({ text: softBreakLongTokens(stripOrphanMarkers(cleaned.slice(last))) });
  }
  return spans.length > 0 ? spans : [{ text: "" }];
}

/**
 * Drop compact tables and the Citations markdown section (footnoted separately).
 * Large UUID-heavy citation lists are a common Yoga crash source.
 */
export function prepareMarkdownForPdf(markdown: string): string {
  let result = markdown.replace(/\r\n/g, "\n");

  for (const heading of ["## Compact table", "## Citations"]) {
    const idx = result.search(new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m"));
    if (idx < 0) continue;
    const after = result.slice(idx + heading.length);
    const nextHeading = after.search(/^##\s+/m);
    if (nextHeading >= 0) {
      result = `${result.slice(0, idx).trimEnd()}\n\n${after.slice(nextHeading).trimStart()}`;
    } else {
      result = result.slice(0, idx).trimEnd();
    }
  }

  return result;
}

function parseMetaBullet(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  const match =
    trimmed.match(/^[-*•]\s+\*\*([^*]+):\*\*\s*(.+)$/) ??
    trimmed.match(/^[-*•]\s+([^:]+):\s*(.+)$/);
  if (!match) return null;
  return { key: match[1]!.trim().toLowerCase(), value: match[2]!.trim() };
}

function isCardHeading(line: string): boolean {
  return /^###\s+(\d+|[PF]\d+)\.\s+/.test(line);
}

export function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = prepareMarkdownForPdf(markdown).split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (isCardHeading(line)) {
      const title = line.replace(/^###\s+/, "").trim();
      const card: FindingCard = { type: "card", title: sanitizePdfText(title, 280) };
      i += 1;

      while (i < lines.length) {
        const next = lines[i] ?? "";
        if (!next.trim()) {
          i += 1;
          continue;
        }
        if (next.startsWith("## ") || isCardHeading(next)) break;

        const meta = parseMetaBullet(next);
        if (meta) {
          if (meta.key === "severity") card.severity = sanitizePdfText(meta.value, 40);
          else if (meta.key === "category") card.category = sanitizePdfText(meta.value, 80);
          else if (meta.key === "agent") card.agent = sanitizePdfText(meta.value, 40);
          else if (meta.key === "status") card.status = sanitizePdfText(meta.value, 40);
          else if (meta.key === "source") card.source = sanitizePdfText(meta.value, 40);
          else if (meta.key === "citation") card.citation = sanitizePdfText(meta.value, 160);
          else if (meta.key === "score") card.score = sanitizePdfText(meta.value, 40);
          i += 1;
          continue;
        }

        if (/^####\s+Context\s*$/i.test(next.trim())) {
          i += 1;
          const parts: string[] = [];
          while (i < lines.length) {
            const body = lines[i] ?? "";
            if (!body.trim()) {
              if (parts.length > 0) break;
              i += 1;
              continue;
            }
            if (body.startsWith("#") || body.trim().startsWith("- ") || isCardHeading(body)) break;
            parts.push(body.trim());
            i += 1;
          }
          card.context = sanitizePdfText(parts.join(" "), 700);
          continue;
        }

        if (/^####\s+How to close\s*$/i.test(next.trim())) {
          i += 1;
          const parts: string[] = [];
          while (i < lines.length) {
            const body = lines[i] ?? "";
            if (!body.trim()) {
              if (parts.length > 0) break;
              i += 1;
              continue;
            }
            if (body.startsWith("#") || body.trim().startsWith("- ") || isCardHeading(body)) break;
            parts.push(body.trim());
            i += 1;
          }
          card.howToClose = sanitizePdfText(parts.join(" "), 700);
          continue;
        }

        break;
      }

      blocks.push(card);
      continue;
    }

    // Skip markdown tables entirely in PDF — spreadsheet export covers them.
    if (line.startsWith("|")) {
      while (i < lines.length && (lines[i] ?? "").startsWith("|")) i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: sanitizePdfText(line.slice(2).trim(), 300) });
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      const heading = sanitizePdfText(line.slice(3).trim(), 300);
      blocks.push({ type: "h2", text: heading });
      i += 1;

      if (isHighlightHeading(heading)) {
        const parts: string[] = [];
        while (i < lines.length) {
          const body = lines[i] ?? "";
          if (!body.trim()) {
            if (parts.length > 0) break;
            i += 1;
            continue;
          }
          if (body.startsWith("#") || body.startsWith("|") || isCardHeading(body)) break;
          if (body.trim().startsWith("- ") || body.trim().startsWith("* ")) break;
          parts.push(sanitizePdfText(body.trim(), 500));
          i += 1;
          if (parts.join(" ").length > 900) break;
        }
        if (parts.length > 0) {
          blocks.push({
            type: "callout",
            label: heading.toUpperCase(),
            text: parts.join(" "),
          });
        }
        continue;
      }

      if (isKeyListHeading(heading)) {
        const linesOut: string[] = [];
        while (i < lines.length) {
          const body = lines[i] ?? "";
          if (!body.trim()) {
            if (linesOut.length > 0) break;
            i += 1;
            continue;
          }
          if (body.startsWith("#") || body.startsWith("|") || isCardHeading(body)) break;
          if (body.trim().startsWith("- ") || body.trim().startsWith("* ")) {
            linesOut.push(sanitizePdfText(body.trim().replace(/^[-*]\s+/, ""), 360));
            i += 1;
            continue;
          }
          // Plain paragraph under key list heading — include once then stop.
          linesOut.push(sanitizePdfText(body.trim(), 400));
          i += 1;
          break;
        }
        if (linesOut.length > 0) {
          blocks.push({
            type: "narrative",
            label: heading.toUpperCase(),
            lines: linesOut.slice(0, 12),
          });
        }
        continue;
      }

      continue;
    }
    if (line.startsWith("### ") || line.startsWith("#### ")) {
      blocks.push({
        type: "h3",
        text: sanitizePdfText(line.replace(/^#+\s+/, "").trim(), 300),
      });
      i += 1;
      continue;
    }
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      blocks.push({
        type: "li",
        text: sanitizePdfText(line.trim().replace(/^[-*]\s+/, ""), 400),
      });
      i += 1;
      continue;
    }
    blocks.push({ type: "p", text: sanitizePdfText(line.trim(), 600) });
    i += 1;
  }

  return blocks;
}

function FindingCardView({ card }: { card: FindingCard }) {
  const severity = (card.severity ?? "").toUpperCase();
  const severityStyle =
    severity === "CRITICAL" || severity === "HIGH"
      ? styles.severityHigh
      : severity === "MEDIUM"
        ? styles.severityMed
        : styles.metaLine;

  const details = [
    card.status ? `Status: ${card.status}` : null,
    card.category ? `Category: ${card.category}` : null,
    card.agent ? `Agent: ${card.agent}` : null,
    card.source ? `Source: ${card.source}` : null,
    card.score ? `Score: ${card.score}` : null,
    card.citation && card.citation !== "—" ? `Evidence: ${card.citation}` : "Evidence: none linked",
  ]
    .filter(Boolean)
    .join("\n");

  return React.createElement(
    View,
    { style: styles.card },
    React.createElement(Text, { style: styles.cardTitle }, card.title),
    card.severity
      ? React.createElement(Text, { style: severityStyle }, `Severity: ${card.severity}`)
      : null,
    React.createElement(Text, { style: styles.metaLine }, details),
    card.context
      ? React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.sectionLabel }, "CONTEXT"),
          React.createElement(Text, { style: styles.sectionBody }, card.context),
        )
      : null,
    card.howToClose
      ? React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.closeLabel }, "HOW TO CLOSE"),
          React.createElement(Text, { style: styles.closeBody }, card.howToClose),
        )
      : null,
  );
}

function Footer() {
  return React.createElement(
    Text,
    {
      style: styles.footer,
      fixed: true,
      render: ({ pageNumber, totalPages }) =>
        `NexusIQ-AI · Confidential  ·  Page ${pageNumber} of ${totalPages}`,
    },
  );
}

function ReportDocument({
  title,
  markdown,
  citations,
  generatedAt,
  mode,
  reportType,
}: {
  title: string;
  markdown: string;
  citations: ChatCitation[];
  generatedAt: string;
  mode: "full" | "simple";
  reportType?: string;
}) {
  const blocks = parseMarkdownBlocks(markdown);
  const safeTitle = sanitizePdfText(title, 200);
  const bodyBlocks = mode === "simple" ? blocks.slice(0, 80) : blocks;
  const coverSub =
    reportType === "BOARD"
      ? "Board pack assembled from specialist scores, consensus, and open findings."
      : reportType === "EXECUTIVE"
        ? "Executive brief assembled from the latest diligence runs and consensus."
        : "Assembled from specialist agent runs, consensus, and open findings.";

  return React.createElement(
    Document,
    { title: safeTitle, author: "NexusIQ-AI", subject: "Diligence report" },
    React.createElement(
      Page,
      { size: "A4", style: styles.coverPage },
      React.createElement(View, { style: styles.accentBar }),
      React.createElement(Text, { style: styles.brandEyebrow }, "NEXUSIQ DILIGENCE"),
      React.createElement(Text, { style: styles.coverTitle }, safeTitle),
      React.createElement(Text, { style: styles.coverSub }, coverSub),
      React.createElement(Text, { style: styles.coverMetaRow }, `Generated: ${generatedAt}`),
      reportType
        ? React.createElement(Text, { style: styles.coverMetaRow }, `Type: ${reportType}`)
        : null,
      React.createElement(
        Text,
        { style: styles.coverMetaRow },
        `Citations: ${citations.length}`,
      ),
      React.createElement(Text, { style: styles.coverMetaRow }, "Classification: Confidential"),
      React.createElement(Footer),
    ),
    React.createElement(
      Page,
      { size: "A4", style: styles.page, wrap: true },
      ...bodyBlocks.map((block, index) => {
        if (block.type === "card") {
          return React.createElement(FindingCardView, { key: index, card: block });
        }
        if (block.type === "callout") {
          return React.createElement(
            View,
            { key: index, style: styles.callout },
            React.createElement(Text, { style: styles.calloutEyebrow }, block.label),
            React.createElement(Text, { style: styles.calloutText }, block.text),
          );
        }
        if (block.type === "narrative") {
          return React.createElement(
            View,
            { key: index, style: styles.narrativeBox },
            React.createElement(Text, { style: styles.narrativeLabel }, block.label),
            ...block.lines.map((line, lineIndex) =>
              React.createElement(
                Text,
                { key: `${index}-${lineIndex}`, style: styles.bullet },
                `• ${line}`,
              ),
            ),
          );
        }
        if (block.type === "h1") {
          return React.createElement(Text, { key: index, style: styles.title }, block.text);
        }
        if (block.type === "h2") {
          return React.createElement(Text, { key: index, style: styles.h2 }, block.text);
        }
        if (block.type === "h3") {
          return React.createElement(Text, { key: index, style: styles.h3 }, block.text);
        }
        if (block.type === "li") {
          return React.createElement(Text, { key: index, style: styles.bullet }, `• ${block.text}`);
        }
        return React.createElement(Text, { key: index, style: styles.paragraph }, block.text);
      }),
      citations.length > 0
        ? React.createElement(
            View,
            { style: styles.footnoteBox },
            React.createElement(Text, { style: styles.h2 }, "Source footnotes"),
            ...citations.slice(0, 25).map((citation, index) =>
              React.createElement(
                Text,
                {
                  key: `fn-${index}`,
                  style: styles.footnote,
                },
                sanitizePdfText(
                  `${index + 1}. ${citation.documentName || citation.documentId}${
                    citation.excerpt ? ` — "${citation.excerpt.slice(0, 80)}"` : ""
                  }`,
                  220,
                ),
              ),
            ),
          )
        : null,
      React.createElement(Footer),
    ),
  );
}

export async function exportPdfBuffer(params: {
  title: string;
  markdown: string;
  citations?: ChatCitation[];
  reportType?: string;
}): Promise<Buffer> {
  const payload = {
    title: params.title,
    markdown: params.markdown,
    citations: params.citations ?? [],
    generatedAt: new Date().toLocaleString(),
    reportType: params.reportType,
  };

  try {
    const element = React.createElement(ReportDocument, { ...payload, mode: "full" });
    return Buffer.from(await renderToBuffer(element));
  } catch (error) {
    console.error("PDF full layout failed, retrying simple mode:", error);
    const element = React.createElement(ReportDocument, { ...payload, mode: "simple" });
    return Buffer.from(await renderToBuffer(element));
  }
}

export function pdfContentType(): string {
  return "application/pdf";
}

export function pdfFileName(title: string, reportId: string): string {
  const safe = title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) || "report";
  return `${safe}-${reportId.slice(0, 8)}.pdf`;
}
