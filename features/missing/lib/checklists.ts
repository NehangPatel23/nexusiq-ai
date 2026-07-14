import type { DocumentClassification, ProjectType } from "@prisma/client";

export type ChecklistItem = {
  category: string;
  title: string;
  description: string;
  expectedType: DocumentClassification;
  /** Optional keywords matched against document name/tags (lowercase). */
  nameHints?: string[];
  framework?: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  followUpTemplate: string;
  /** Demo/standard data-room folder where this document type is expected to live. */
  expectedFolderPath?: string;
};

const MA_CHECKLIST: ChecklistItem[] = [
  {
    category: "Financial",
    title: "Financial statements",
    description: "Audited or management financial statements covering recent periods.",
    expectedType: "FINANCIAL",
    nameHints: ["financial", "income", "balance sheet", "p&l", "10-k", "10q"],
    severity: "CRITICAL",
    followUpTemplate: "Please provide audited or management financial statements for the last 3 years.",
    expectedFolderPath: "01-Financials",
  },
  {
    category: "Capitalization",
    title: "Cap table",
    description: "Current capitalization table including preferred and option pools.",
    expectedType: "FINANCIAL",
    nameHints: ["cap table", "capitalization", "equity"],
    severity: "CRITICAL",
    followUpTemplate: "Please provide the current capitalization table including option pools.",
    expectedFolderPath: "01-Financials",
  },
  {
    category: "Legal",
    title: "Material contracts",
    description: "Customer, supplier, and partnership agreements material to the deal.",
    expectedType: "CONTRACT",
    nameHints: ["agreement", "contract", "msa", "sow"],
    severity: "HIGH",
    followUpTemplate: "Please provide copies of all material contracts currently in force.",
    expectedFolderPath: "02-Legal",
  },
  {
    category: "Legal",
    title: "Litigation summary",
    description: "Pending or threatened litigation, arbitration, or regulatory actions.",
    expectedType: "LEGAL",
    nameHints: ["litigation", "lawsuit", "dispute", "claim"],
    severity: "HIGH",
    followUpTemplate: "Please provide a summary of pending or threatened litigation and disputes.",
    expectedFolderPath: "02-Legal",
  },
  {
    category: "IP",
    title: "IP schedule",
    description: "Patents, trademarks, and key IP ownership documentation.",
    expectedType: "LEGAL",
    nameHints: ["patent", "trademark", "ip schedule", "intellectual property"],
    severity: "MEDIUM",
    followUpTemplate: "Please provide an IP schedule covering patents, trademarks, and ownership.",
    expectedFolderPath: "02-Legal",
  },
  {
    category: "Tax",
    title: "Tax returns",
    description: "Federal and state tax returns for recent filing years.",
    expectedType: "TAX",
    nameHints: ["tax return", "form 1120", "tax filing"],
    severity: "HIGH",
    followUpTemplate: "Please provide federal and state tax returns for the last 3 filing years.",
    expectedFolderPath: "01-Financials",
  },
  {
    category: "HR",
    title: "Employee list",
    description: "Current employee roster with roles and tenure.",
    expectedType: "HR",
    nameHints: ["employee", "headcount", "org chart", "roster"],
    severity: "MEDIUM",
    followUpTemplate: "Please provide a current employee list with roles and start dates.",
    expectedFolderPath: "04-HR",
  },
];

const VENDOR_DD_CHECKLIST: ChecklistItem[] = [
  {
    category: "Security",
    title: "SOC 2 report",
    description: "Latest SOC 2 Type II (or equivalent) attestation.",
    expectedType: "COMPLIANCE",
    nameHints: ["soc 2", "soc2", "attestation", "iso 27001"],
    framework: "SOC2",
    severity: "CRITICAL",
    followUpTemplate: "Please provide the latest SOC 2 Type II report or equivalent attestation.",
    expectedFolderPath: "03-Compliance",
  },
  {
    category: "Insurance",
    title: "Insurance certificates",
    description: "Evidence of cyber, E&O, and general liability coverage.",
    expectedType: "COMPLIANCE",
    nameHints: ["insurance", "certificate of insurance", "coi"],
    severity: "HIGH",
    followUpTemplate: "Please provide current certificates of insurance (cyber, E&O, GL).",
    expectedFolderPath: "03-Compliance",
  },
  {
    category: "Financial",
    title: "Vendor financials",
    description: "Recent financial statements or credit information.",
    expectedType: "FINANCIAL",
    nameHints: ["financial", "balance", "revenue"],
    severity: "MEDIUM",
    followUpTemplate: "Please provide recent financial statements for vendor diligence.",
    expectedFolderPath: "01-Financials",
  },
  {
    category: "References",
    title: "Customer references",
    description: "Reference contacts or case studies from comparable customers.",
    expectedType: "CORRESPONDENCE",
    nameHints: ["reference", "case study", "testimonial"],
    severity: "LOW",
    followUpTemplate: "Please provide customer references relevant to this engagement.",
    expectedFolderPath: "05-Commercial",
  },
  {
    category: "Security",
    title: "Security questionnaire",
    description: "Completed vendor security / privacy questionnaire.",
    expectedType: "COMPLIANCE",
    nameHints: ["security questionnaire", "sig", "caiq", "privacy"],
    framework: "Vendor Security",
    severity: "HIGH",
    followUpTemplate: "Please complete and return the vendor security questionnaire.",
    expectedFolderPath: "03-Compliance",
  },
];

const AUDIT_CHECKLIST: ChecklistItem[] = [
  {
    category: "Policies",
    title: "Policy pack",
    description: "Current information security and operational policies.",
    expectedType: "COMPLIANCE",
    nameHints: ["policy", "policies", "handbook"],
    framework: "Internal Controls",
    severity: "HIGH",
    followUpTemplate: "Please provide the current policy pack covering security and operations.",
    expectedFolderPath: "03-Compliance",
  },
  {
    category: "Controls",
    title: "Controls evidence",
    description: "Evidence samples supporting key control activities.",
    expectedType: "COMPLIANCE",
    nameHints: ["control", "evidence", "walkthrough", "sample"],
    framework: "Internal Controls",
    severity: "CRITICAL",
    followUpTemplate: "Please provide evidence samples for key control activities.",
    expectedFolderPath: "03-Compliance",
  },
  {
    category: "Prior audits",
    title: "Prior audit reports",
    description: "Previous internal or external audit reports and remediation status.",
    expectedType: "COMPLIANCE",
    nameHints: ["audit report", "prior audit", "findings"],
    severity: "HIGH",
    followUpTemplate: "Please provide prior audit reports and open remediation status.",
    expectedFolderPath: "03-Compliance",
  },
];

const INVESTMENT_CHECKLIST: ChecklistItem[] = [
  {
    category: "Financial",
    title: "Financial model",
    description: "Forward-looking financial model and key assumptions.",
    expectedType: "FINANCIAL",
    nameHints: ["model", "projection", "forecast", "budget"],
    severity: "CRITICAL",
    followUpTemplate: "Please provide the financial model including key assumptions.",
    expectedFolderPath: "01-Financials",
  },
  {
    category: "Market",
    title: "Market / competitive deck",
    description: "Market sizing and competitive landscape documentation.",
    expectedType: "OPERATIONAL",
    nameHints: ["market", "competitive", "tam", "pitch"],
    severity: "MEDIUM",
    followUpTemplate: "Please provide market sizing and competitive landscape materials.",
    expectedFolderPath: "05-Commercial",
  },
  {
    category: "Legal",
    title: "Investment agreements",
    description: "Term sheets, investor rights, and related agreements.",
    expectedType: "CONTRACT",
    nameHints: ["term sheet", "investor", "shareholders agreement"],
    severity: "HIGH",
    followUpTemplate: "Please provide investment agreements and related term documentation.",
    expectedFolderPath: "02-Legal",
  },
  {
    category: "Financial",
    title: "Historical financials",
    description: "Historical P&L and balance sheet for diligence.",
    expectedType: "FINANCIAL",
    nameHints: ["financial", "income", "historical"],
    severity: "HIGH",
    followUpTemplate: "Please provide historical financial statements for diligence.",
    expectedFolderPath: "01-Financials",
  },
];

const INTERNAL_CHECKLIST: ChecklistItem[] = [
  {
    category: "Operational",
    title: "Process documentation",
    description: "Documented operating procedures relevant to the review.",
    expectedType: "OPERATIONAL",
    nameHints: ["sop", "process", "procedure", "runbook"],
    severity: "MEDIUM",
    followUpTemplate: "Please provide operating procedures relevant to this review.",
  },
  {
    category: "Compliance",
    title: "Compliance evidence",
    description: "Evidence of compliance with applicable internal standards.",
    expectedType: "COMPLIANCE",
    nameHints: ["compliance", "attestation", "policy"],
    severity: "HIGH",
    followUpTemplate: "Please provide compliance evidence for applicable internal standards.",
    expectedFolderPath: "03-Compliance",
  },
  {
    category: "Financial",
    title: "Budget / forecast",
    description: "Current budget and forecast for the scope under review.",
    expectedType: "FINANCIAL",
    nameHints: ["budget", "forecast"],
    severity: "MEDIUM",
    followUpTemplate: "Please provide the current budget and forecast for this scope.",
    expectedFolderPath: "01-Financials",
  },
];

const BY_TYPE: Record<ProjectType, ChecklistItem[]> = {
  MA: MA_CHECKLIST,
  VENDOR_DD: VENDOR_DD_CHECKLIST,
  AUDIT: AUDIT_CHECKLIST,
  INVESTMENT: INVESTMENT_CHECKLIST,
  INTERNAL: INTERNAL_CHECKLIST,
};

export function getChecklistForProjectType(type: ProjectType): ChecklistItem[] {
  return BY_TYPE[type] ?? INTERNAL_CHECKLIST;
}
