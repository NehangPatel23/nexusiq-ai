import type { ReportFormat, ReportType } from "@prisma/client";

export type AudiencePresetId = "BOARD_PACK" | "IC_MEMO" | "RISK_EXPORT" | "EXEC_BRIEF";

export type AudiencePreset = {
  id: AudiencePresetId;
  label: string;
  description: string;
  reportType: ReportType;
  formats: ReportFormat[];
  titleSuffix: string;
};

/** One-click generate configs — eager formats matched to audience. */
export const AUDIENCE_PRESETS: AudiencePreset[] = [
  {
    id: "BOARD_PACK",
    label: "Board pack",
    description: "Board narrative with print PDF and slide deck pre-built.",
    reportType: "BOARD",
    formats: ["MARKDOWN", "PDF", "PPTX"],
    titleSuffix: "Board Pack",
  },
  {
    id: "IC_MEMO",
    label: "IC memo",
    description: "Investment committee memo with PDF for circulation.",
    reportType: "INVESTMENT_MEMO",
    formats: ["MARKDOWN", "PDF"],
    titleSuffix: "IC Memo",
  },
  {
    id: "RISK_EXPORT",
    label: "Risk export",
    description: "Risk register with Excel + PDF for owners.",
    reportType: "RISK_REGISTER",
    formats: ["MARKDOWN", "XLSX", "PDF"],
    titleSuffix: "Risk Register",
  },
  {
    id: "EXEC_BRIEF",
    label: "Exec brief",
    description: "Executive summary PDF for leadership read-out.",
    reportType: "EXECUTIVE",
    formats: ["MARKDOWN", "PDF"],
    titleSuffix: "Executive Brief",
  },
];

export function getAudiencePreset(id: AudiencePresetId): AudiencePreset | undefined {
  return AUDIENCE_PRESETS.find((preset) => preset.id === id);
}
