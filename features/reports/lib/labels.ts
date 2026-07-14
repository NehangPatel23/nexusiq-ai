import type { ReportType } from "@prisma/client";
import {
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Gavel,
  Landmark,
  Presentation,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  EXECUTIVE: "Executive Report",
  BOARD: "Board Report",
  INVESTMENT_MEMO: "Investment Memo",
  AUDIT: "Audit Report",
  RISK_REGISTER: "Risk Register",
  ACTION_PLAN: "Action Plan",
  PPTX: "Slide Deck",
};

export const REPORT_TYPE_DESCRIPTIONS: Record<ReportType, string> = {
  EXECUTIVE: "Summary, findings, and recommendation package",
  BOARD: "Board-ready narrative with risk heatmap",
  INVESTMENT_MEMO: "Deal thesis, risks, and go/no-go stance",
  AUDIT: "Compliance gaps, evidence, and remediation",
  RISK_REGISTER: "Tabular findings — Excel-friendly",
  ACTION_PLAN: "Prioritized next actions from diligence",
  PPTX: "Board-ready slide deck with scores, findings, and next steps",
};

export const REPORT_TYPE_ICONS: Record<ReportType, LucideIcon> = {
  EXECUTIVE: FileText,
  BOARD: Landmark,
  INVESTMENT_MEMO: ScrollText,
  AUDIT: Gavel,
  RISK_REGISTER: FileSpreadsheet,
  ACTION_PLAN: ClipboardList,
  PPTX: Presentation,
};

export const REPORT_TYPES = Object.keys(REPORT_TYPE_LABELS) as ReportType[];

const NARRATIVE_TYPES = new Set<ReportType>([
  "EXECUTIVE",
  "BOARD",
  "INVESTMENT_MEMO",
  "AUDIT",
]);

export function isNarrativeReportType(reportType: ReportType): boolean {
  return NARRATIVE_TYPES.has(reportType);
}

export const FORMAT_LABELS = {
  md: "Markdown",
  pdf: "PDF",
  xlsx: "Excel",
  pptx: "PowerPoint",
} as const;

export function reportTypeAccent(reportType: ReportType): string {
  switch (reportType) {
    case "EXECUTIVE":
      return "border-primary/30 bg-primary/10 text-primary";
    case "BOARD":
      return "border-sky-600/30 bg-sky-500/12 text-tint-sky dark:border-sky-500/30 dark:bg-sky-500/10";
    case "INVESTMENT_MEMO":
      return "border-emerald-500/30 bg-emerald-500/10 text-tint-emerald";
    case "AUDIT":
      return "badge-tint-amber";
    case "RISK_REGISTER":
      return "border-rose-500/30 bg-rose-500/10 text-tint-rose";
    case "ACTION_PLAN":
      return "border-violet-500/30 bg-violet-500/10 text-violet-900 dark:text-violet-300";
    case "PPTX":
      return "border-orange-500/30 bg-orange-500/10 text-tint-orange";
    default:
      return "border-border/60 bg-muted/30 text-muted-foreground";
  }
}
