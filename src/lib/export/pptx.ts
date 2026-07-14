import type { DeckModel, DeckSlide } from "@/features/reports/lib/build-deck";
import type { SlideOutline } from "@/features/reports/lib/assemble";

/** Bump when PPTX layout changes so cached binaries regenerate. */
export const REPORT_PPTX_EXPORTER_VERSION = 2;

const THEME = {
  ink: "0F172A",
  muted: "64748B",
  soft: "94A3B8",
  line: "E2E8F0",
  surface: "F8FAFC",
  accent: "2563EB",
  accentSoft: "DBEAFE",
  white: "FFFFFF",
  danger: "B91C1C",
  dangerSoft: "FEF2F2",
  warn: "B45309",
  warnSoft: "FFFBEB",
  ok: "047857",
  okSoft: "ECFDF5",
  dark: "0B1220",
};

// pptxgenjs typings are awkward for helpers — keep the surface intentionally loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pptx = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Slide = any;

function severityColors(severity?: string): { ink: string; soft: string } {
  const value = (severity ?? "").toUpperCase();
  if (value === "CRITICAL" || value === "HIGH") {
    return { ink: THEME.danger, soft: THEME.dangerSoft };
  }
  if (value === "MEDIUM") {
    return { ink: THEME.warn, soft: THEME.warnSoft };
  }
  return { ink: THEME.muted, soft: THEME.surface };
}

function addAccentBar(slide: Slide, pptx: Pptx) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.12,
    h: 7.5,
    fill: { color: THEME.accent },
    line: { color: THEME.accent },
  });
}

function addFooter(slide: Slide, deck: DeckModel, page: number, total: number) {
  slide.addText(`${deck.reportLabel}  ·  ${deck.projectName}`, {
    x: 0.45,
    y: 7.05,
    w: 6.5,
    h: 0.25,
    fontSize: 9,
    color: THEME.soft,
    fontFace: "Calibri",
  });
  slide.addText(`${page} / ${total}`, {
    x: 8.2,
    y: 7.05,
    w: 1.3,
    h: 0.25,
    fontSize: 9,
    color: THEME.soft,
    align: "right",
    fontFace: "Calibri",
  });
}

function renderCover(pptx: Pptx, deck: DeckModel) {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.dark };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.28,
    h: 7.5,
    fill: { color: THEME.accent },
    line: { color: THEME.accent },
  });
  slide.addText("NEXUSIQ DILIGENCE", {
    x: 0.7,
    y: 1.6,
    w: 8.5,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: THEME.accentSoft,
    fontFace: "Calibri",
    charSpacing: 3,
  });
  slide.addText(deck.title, {
    x: 0.7,
    y: 2.2,
    w: 8.5,
    h: 1.4,
    fontSize: 30,
    bold: true,
    color: THEME.white,
    fontFace: "Calibri",
    valign: "top",
  });
  slide.addText(`${deck.reportLabel} for ${deck.projectName}`, {
    x: 0.7,
    y: 3.8,
    w: 8.5,
    h: 0.4,
    fontSize: 16,
    color: THEME.soft,
    fontFace: "Calibri",
  });
  slide.addText(`Generated ${deck.generatedAt}  ·  Confidential`, {
    x: 0.7,
    y: 6.5,
    w: 8.5,
    h: 0.3,
    fontSize: 11,
    color: THEME.soft,
    fontFace: "Calibri",
  });
}

function renderSection(
  pptx: Pptx,
  deck: DeckModel,
  slideData: Extract<DeckSlide, { kind: "section" }>,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.surface };
  addAccentBar(slide, pptx);
  slide.addText(slideData.title, {
    x: 0.7,
    y: 2.6,
    w: 8.5,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: THEME.ink,
    fontFace: "Calibri",
  });
  if (slideData.subtitle) {
    slide.addText(slideData.subtitle, {
      x: 0.7,
      y: 3.5,
      w: 8.5,
      h: 0.6,
      fontSize: 15,
      color: THEME.muted,
      fontFace: "Calibri",
    });
  }
  addFooter(slide, deck, page, total);
}

function renderBullets(
  pptx: Pptx,
  deck: DeckModel,
  slideData: Extract<DeckSlide, { kind: "bullets" }>,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  addAccentBar(slide, pptx);
  slide.addText(slideData.heading, {
    x: 0.55,
    y: 0.35,
    w: 8.8,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: THEME.ink,
    fontFace: "Calibri",
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.55,
    y: 0.95,
    w: 1.4,
    h: 0.06,
    fill: { color: THEME.accent },
    line: { color: THEME.accent },
  });
  slide.addText(
    slideData.bullets.map((bullet) => ({
      text: bullet,
      options: { bullet: true, breakLine: true },
    })),
    {
      x: 0.6,
      y: 1.25,
      w: 8.7,
      h: slideData.footnote ? 4.8 : 5.3,
      fontSize: 15,
      color: THEME.ink,
      fontFace: "Calibri",
      valign: "top",
      paraSpaceAfter: 8,
    },
  );
  if (slideData.footnote) {
    slide.addText(slideData.footnote, {
      x: 0.6,
      y: 6.5,
      w: 8.7,
      h: 0.35,
      fontSize: 11,
      color: THEME.muted,
      italic: true,
      fontFace: "Calibri",
    });
  }
  addFooter(slide, deck, page, total);
}

function renderScores(
  pptx: Pptx,
  deck: DeckModel,
  slideData: Extract<DeckSlide, { kind: "scores" }>,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  addAccentBar(slide, pptx);
  slide.addText(slideData.heading, {
    x: 0.55,
    y: 0.35,
    w: 8.8,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: THEME.ink,
    fontFace: "Calibri",
  });

  const scores = slideData.scores.slice(0, 5);
  const cardW = 1.65;
  const gap = 0.2;
  const startX = 0.55;
  scores.forEach((score, index) => {
    const x = startX + index * (cardW + gap);
    const value = score.score;
    const tone =
      value == null ? THEME.muted : value >= 70 ? THEME.ok : value >= 40 ? THEME.warn : THEME.danger;
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y: 1.5,
      w: cardW,
      h: 2.4,
      fill: { color: THEME.surface },
      line: { color: THEME.line },
      shadow: { type: "outer", color: "000000", blur: 4, opacity: 0.08, offset: 1 },
    });
    slide.addText(score.label, {
      x,
      y: 1.75,
      w: cardW,
      h: 0.45,
      fontSize: 12,
      color: THEME.muted,
      align: "center",
      fontFace: "Calibri",
    });
    slide.addText(value == null ? "—" : String(Math.round(value)), {
      x,
      y: 2.35,
      w: cardW,
      h: 0.9,
      fontSize: 34,
      bold: true,
      color: tone,
      align: "center",
      fontFace: "Calibri",
    });
    slide.addText("score", {
      x,
      y: 3.3,
      w: cardW,
      h: 0.3,
      fontSize: 11,
      color: THEME.soft,
      align: "center",
      fontFace: "Calibri",
    });
  });

  if (slideData.footnote) {
    slide.addText(slideData.footnote, {
      x: 0.55,
      y: 4.3,
      w: 8.8,
      h: 0.4,
      fontSize: 12,
      color: THEME.muted,
      fontFace: "Calibri",
    });
  }
  addFooter(slide, deck, page, total);
}

function renderCallout(
  pptx: Pptx,
  deck: DeckModel,
  slideData: Extract<DeckSlide, { kind: "callout" }>,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  addAccentBar(slide, pptx);
  slide.addText(slideData.heading, {
    x: 0.55,
    y: 0.35,
    w: 8.8,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: THEME.ink,
    fontFace: "Calibri",
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.55,
    y: 1.3,
    w: 8.8,
    h: 2.2,
    fill: { color: THEME.accentSoft },
    line: { color: THEME.accentSoft },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.55,
    y: 1.3,
    w: 0.12,
    h: 2.2,
    fill: { color: THEME.accent },
    line: { color: THEME.accent },
  });
  slide.addText(slideData.body, {
    x: 0.9,
    y: 1.55,
    w: 8.2,
    h: 1.7,
    fontSize: 18,
    bold: true,
    color: THEME.ink,
    fontFace: "Calibri",
    valign: "middle",
  });
  if (slideData.detail) {
    slide.addText(slideData.detail, {
      x: 0.55,
      y: 3.8,
      w: 8.8,
      h: 2.4,
      fontSize: 14,
      color: THEME.muted,
      fontFace: "Calibri",
      valign: "top",
    });
  }
  addFooter(slide, deck, page, total);
}

function renderItem(
  pptx: Pptx,
  deck: DeckModel,
  slideData: Extract<DeckSlide, { kind: "item" }>,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  const tone = severityColors(slideData.severity);
  addAccentBar(slide, pptx);

  if (slideData.eyebrow) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 0.3,
      w: 1.1,
      h: 0.32,
      fill: { color: THEME.accentSoft },
      line: { color: THEME.accentSoft },
    });
    slide.addText(slideData.eyebrow, {
      x: 0.55,
      y: 0.3,
      w: 1.1,
      h: 0.32,
      fontSize: 11,
      bold: true,
      color: THEME.accent,
      align: "center",
      valign: "middle",
      fontFace: "Calibri",
    });
  }

  slide.addText(slideData.heading, {
    x: 0.55,
    y: slideData.eyebrow ? 0.75 : 0.35,
    w: 8.8,
    h: 0.85,
    fontSize: 20,
    bold: true,
    color: THEME.ink,
    fontFace: "Calibri",
    valign: "top",
  });

  let y = slideData.eyebrow ? 1.7 : 1.3;
  if (slideData.severity) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y,
      w: 1.5,
      h: 0.32,
      fill: { color: tone.soft },
      line: { color: tone.soft },
    });
    slide.addText(slideData.severity.toUpperCase(), {
      x: 0.55,
      y,
      w: 1.5,
      h: 0.32,
      fontSize: 11,
      bold: true,
      color: tone.ink,
      align: "center",
      valign: "middle",
      fontFace: "Calibri",
    });
    y += 0.5;
  }

  if (slideData.meta.length > 0) {
    slide.addText(slideData.meta.join("   ·   "), {
      x: 0.55,
      y,
      w: 8.8,
      h: 0.45,
      fontSize: 12,
      color: THEME.muted,
      fontFace: "Calibri",
    });
    y += 0.55;
  }

  if (slideData.context) {
    slide.addText("CONTEXT", {
      x: 0.55,
      y,
      w: 8.8,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: THEME.muted,
      fontFace: "Calibri",
    });
    y += 0.28;
    slide.addText(slideData.context, {
      x: 0.55,
      y,
      w: 8.8,
      h: 1.5,
      fontSize: 13,
      color: THEME.ink,
      fontFace: "Calibri",
      valign: "top",
    });
    y += 1.65;
  }

  if (slideData.howToClose) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: Math.min(y, 5.1),
      w: 8.8,
      h: 1.45,
      fill: { color: THEME.okSoft },
      line: { color: THEME.okSoft },
    });
    slide.addText("HOW TO CLOSE", {
      x: 0.75,
      y: Math.min(y, 5.1) + 0.12,
      w: 8.4,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: THEME.ok,
      fontFace: "Calibri",
    });
    slide.addText(slideData.howToClose, {
      x: 0.75,
      y: Math.min(y, 5.1) + 0.4,
      w: 8.4,
      h: 0.9,
      fontSize: 12,
      color: THEME.ink,
      fontFace: "Calibri",
      valign: "top",
    });
  }

  addFooter(slide, deck, page, total);
}

export async function exportPptxBuffer(params: {
  deck?: DeckModel;
  /** @deprecated Prefer `deck`. Kept for older callers/tests. */
  outline?: SlideOutline;
  projectName: string;
}): Promise<Buffer> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx: Pptx = new PptxGenJS();

  const deck: DeckModel =
    params.deck ??
    ({
      title: params.outline?.title ?? `${params.projectName} Diligence`,
      projectName: params.projectName,
      reportLabel: "Diligence deck",
      generatedAt: new Date().toLocaleString(),
      slides: (params.outline?.slides ?? []).map((slide) => ({
        kind: "bullets" as const,
        heading: slide.heading,
        bullets: slide.bullets,
      })),
    } satisfies DeckModel);

  pptx.author = "NexusIQ-AI";
  pptx.title = deck.title;
  pptx.subject = `${deck.reportLabel} for ${deck.projectName}`;
  pptx.company = "NexusIQ-AI";

  const contentSlides = deck.slides;
  const total = contentSlides.length + 1;

  renderCover(pptx, deck);

  contentSlides.forEach((slide, index) => {
    const page = index + 2;
    switch (slide.kind) {
      case "section":
        renderSection(pptx, deck, slide, page, total);
        break;
      case "scores":
        renderScores(pptx, deck, slide, page, total);
        break;
      case "callout":
        renderCallout(pptx, deck, slide, page, total);
        break;
      case "item":
        renderItem(pptx, deck, slide, page, total);
        break;
      case "bullets":
      default:
        renderBullets(pptx, deck, slide, page, total);
        break;
    }
  });

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(output as ArrayBuffer);
}

export function pptxContentType(): string {
  return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
}

export function pptxFileName(title: string, reportId: string): string {
  const safe = title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) || "deck";
  return `${safe}-${reportId.slice(0, 8)}.pptx`;
}
