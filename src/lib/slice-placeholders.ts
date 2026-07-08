import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  FileText,
  FolderOpen,
  MessageSquare,
  Search,
  Shield,
} from "lucide-react";

export interface SlicePlaceholderConfig {
  title: string;
  description: string;
  slice: number;
  sliceLabel: string;
  icon: LucideIcon;
  highlights?: string[];
}

export const SLICE_PLACEHOLDERS: Record<string, SlicePlaceholderConfig> = {
  projects: {
    title: "Projects",
    description:
      "Create M&A, vendor diligence, audit, and investment projects with deal metadata and risk dashboards.",
    slice: 4,
    sliceLabel: "Projects + Dashboard",
    icon: FolderOpen,
    highlights: ["Project types", "Deal metadata", "Risk overview widgets"],
  },
  search: {
    title: "Smart Search",
    description:
      "Hybrid natural language, keyword, and semantic search across your entire data room with cited snippets.",
    slice: 7,
    sliceLabel: "Smart Search",
    icon: Search,
    highlights: ["Hybrid search", "Saved searches", "Highlighted snippets"],
  },
  chat: {
    title: "Chat",
    description:
      "Ask questions about your diligence workspace with streaming cited answers and confidence badges.",
    slice: 8,
    sliceLabel: "Chat",
    icon: MessageSquare,
    highlights: ["Cited Q&A", "Agent selector", "Chat history"],
  },
  intelligence: {
    title: "Intelligence Agents",
    description:
      "Run Financial, Legal, Compliance, Risk, and Fraud agents in parallel — every finding linked to source documents.",
    slice: 9,
    sliceLabel: "Intelligence Agents",
    icon: Bot,
    highlights: ["Five specialized agents", "Score cards", "Consensus engine"],
  },
  reports: {
    title: "Reports",
    description:
      "Generate executive summaries, board memos, investment memos, and risk registers with PDF and Excel export.",
    slice: 11,
    sliceLabel: "Reports & Export",
    icon: FileText,
    highlights: ["Executive reports", "PDF export", "Report history"],
  },
  history: {
    title: "History",
    description:
      "Org-wide audit log with filters and project comparison views for tracking diligence activity.",
    slice: 14,
    sliceLabel: "History + Settings",
    icon: BarChart3,
    highlights: ["Audit log", "Activity filters", "Project comparison"],
  },
  admin: {
    title: "Admin",
    description:
      "System health monitoring, usage stats, and reindex controls for organization owners.",
    slice: 16,
    sliceLabel: "Admin",
    icon: Shield,
    highlights: ["Health checks", "Usage stats", "Owner-only controls"],
  },
};
