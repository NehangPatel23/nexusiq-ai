import type { DocumentClassification } from "@prisma/client";

import type { DataRoomDocument } from "./types";

export type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  /** Match classification, file type, or name keywords */
  match: {
    classifications?: DocumentClassification[];
    types?: string[];
    keywords?: string[];
  };
};

export const DATA_ROOM_CHECKLIST: ChecklistItem[] = [
  {
    id: "financials",
    label: "Financial statements",
    description: "Audited or management financials",
    match: { classifications: ["FINANCIAL"], keywords: ["financial", "balance", "income", "p&l"] },
  },
  {
    id: "legal",
    label: "Legal agreements",
    description: "Material contracts and corporate docs",
    match: { classifications: ["LEGAL", "CONTRACT"], keywords: ["contract", "agreement", "legal"] },
  },
  {
    id: "tax",
    label: "Tax filings",
    description: "Returns and tax workpapers",
    match: { classifications: ["TAX"], keywords: ["tax", "1040", "w-2"] },
  },
  {
    id: "hr",
    label: "HR & payroll",
    description: "Employee records and org charts",
    match: { classifications: ["HR"], keywords: ["employee", "payroll", "org chart", "hr"] },
  },
  {
    id: "compliance",
    label: "Compliance policies",
    description: "Policies, certifications, audits",
    match: { classifications: ["COMPLIANCE"], keywords: ["compliance", "policy", "certification"] },
  },
  {
    id: "operational",
    label: "Operational data",
    description: "KPIs, customer lists, vendor data",
    match: {
      classifications: ["OPERATIONAL"],
      types: ["CSV", "XLSX"],
      keywords: ["customer", "vendor", "kpi", "operational"],
    },
  },
  {
    id: "board",
    label: "Board materials",
    description: "Minutes, decks, resolutions",
    match: { keywords: ["board", "minutes", "resolution", "deck"] },
  },
  {
    id: "cap-table",
    label: "Cap table / equity",
    description: "Ownership and equity records",
    match: { keywords: ["cap table", "equity", "409a", "stock option"] },
  },
];

function docMatchesItem(doc: DataRoomDocument, item: ChecklistItem): boolean {
  const name = doc.name.toLowerCase();
  const { classifications, types, keywords } = item.match;

  if (classifications?.length && doc.classification && classifications.includes(doc.classification as DocumentClassification)) {
    return true;
  }
  if (types?.length && types.includes(doc.type)) {
    return true;
  }
  if (keywords?.some((kw) => name.includes(kw.toLowerCase()))) {
    return true;
  }
  return false;
}

export function computeChecklistProgress(documents: DataRoomDocument[]) {
  const items = DATA_ROOM_CHECKLIST.map((item) => {
    const matched = documents.filter((doc) => docMatchesItem(doc, item));
    const ready = matched.filter((doc) => doc.status === "READY");
    const processing = matched.filter(
      (doc) => doc.status === "PENDING" || doc.status === "PROCESSING",
    );
    const failed = matched.filter((doc) => doc.status === "FAILED");

    return {
      ...item,
      complete: ready.length > 0,
      count: matched.length,
      readyCount: ready.length,
      processingCount: processing.length,
      failedCount: failed.length,
      documentNames: ready.slice(0, 3).map((d) => d.name),
    };
  });

  const completeCount = items.filter((i) => i.complete).length;
  const percent = Math.round((completeCount / items.length) * 100);

  return { items, completeCount, total: items.length, percent };
}
