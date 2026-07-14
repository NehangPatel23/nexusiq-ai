"use client";

import type { FindingSeverity } from "@prisma/client";
import Link from "next/link";
import { CheckCircle2, ClipboardList, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { dataRoomCitationHref } from "@/features/chat/lib/citation-links";
import type { ChatCitation } from "@/lib/ai/citations";

import type { ActionPlanItem } from "../lib/assemble-shared";
import { humanizeLabel, resolveCitationIndex } from "../lib/assemble-shared";

const SEVERITY_VARIANT: Record<
  FindingSeverity | "UNKNOWN" | "n/a",
  "destructive" | "default" | "secondary" | "outline" | "warning"
> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "secondary",
  UNKNOWN: "outline",
  "n/a": "outline",
};

type ReportActionPlanProps = {
  items: ActionPlanItem[];
  projectId: string;
  citations: ChatCitation[];
  onCitationFocus?: (index: number) => void;
};

export function parseActionPlanItemsFromMarkdown(content: string): ActionPlanItem[] {
  const items: ActionPlanItem[] = [];

  // Prefer compact table when present.
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
      severity: (severity as FindingSeverity | "UNKNOWN" | "n/a") || "UNKNOWN",
      citationIndex: null,
      documentId: null,
      chunkId: null,
      remediation:
        "Assign an owner, set a target date, confirm evidence in the data room, and mark complete when the diligence condition is cleared.",
    });
  }

  if (items.length > 0) return items;

  // Fallback: ### P1. Title style headings from new markdown.
  const headingRe = /^###\s+(P\d+|F\d+)\.\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(content)) !== null) {
    items.push({
      id: match[1]!,
      priority: match[1]!,
      action: match[2]!.trim(),
      detail: "",
      source: "—",
      severity: "UNKNOWN",
      citationIndex: null,
      documentId: null,
      chunkId: null,
      remediation:
        "Assign an owner, set a target date, confirm evidence in the data room, and mark complete when the diligence condition is cleared.",
    });
  }

  return items;
}

export function ReportActionPlan({
  items,
  projectId,
  citations,
  onCitationFocus,
}: ReportActionPlanProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 px-5 py-10 text-center text-sm text-muted-foreground">
        No prioritized actions were available for this plan.
      </div>
    );
  }

  return (
    <div className="space-y-5 report-print-stack">
      <section className="rounded-2xl border border-border/60 bg-muted/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-semibold tracking-tight">Action plan</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {items.length} prioritized step{items.length === 1 ? "" : "s"} from executive guidance
              and open findings. Work top-down; use close-out notes to clear each item.
            </p>
          </div>
        </div>
      </section>

      <ol className="space-y-4">
        {items.map((item) => {
          const citationIndex =
            item.citationIndex ?? resolveCitationIndex(item.documentId, item.chunkId, citations);
          const citation = citationIndex != null ? citations[citationIndex - 1] : undefined;
          const href =
            citation != null
              ? dataRoomCitationHref(projectId, citation, citationIndex ?? 0)
              : item.documentId
                ? `/dashboard/projects/${projectId}/data-room?doc=${item.documentId}${
                    item.chunkId ? `&chunk=${item.chunkId}` : ""
                  }`
                : null;

          return (
            <li
              key={item.id}
              className="report-print-card break-inside-avoid rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                      {item.priority}
                    </Badge>
                    <Badge variant={SEVERITY_VARIANT[item.severity]}>{item.severity}</Badge>
                    <Badge variant="secondary" className="normal-case tracking-normal">
                      {item.source}
                    </Badge>
                    {item.category ? (
                      <Badge variant="outline" className="normal-case tracking-normal">
                        {item.category}
                      </Badge>
                    ) : null}
                  </div>
                  <h4 className="font-display text-base font-semibold tracking-tight text-foreground">
                    {item.action}
                  </h4>
                </div>
              </div>

              {item.detail ? (
                <div className="mt-4 rounded-xl border border-border/50 bg-muted/15 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Context
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-foreground/85">{item.detail}</p>
                </div>
              ) : null}

              {href ? (
                <p className="mt-3 text-sm">
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {citationIndex != null ? `[${citationIndex}] ` : null}
                    {citation?.documentName ?? "Open evidence"}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                  {citationIndex != null && onCitationFocus ? (
                    <button
                      type="button"
                      className="ml-3 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      onClick={() => onCitationFocus(citationIndex)}
                    >
                      View in panel
                    </button>
                  ) : null}
                </p>
              ) : null}

              <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  How to close
                </p>
                <p className="mt-1.5 text-sm leading-6 text-foreground/85">{item.remediation}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
