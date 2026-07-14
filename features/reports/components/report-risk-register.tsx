"use client";

import type { FindingSeverity, RiskStatus } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ExternalLink, ListChecks, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { dataRoomCitationHref } from "@/features/chat/lib/citation-links";
import {
  RiskStatusSelect,
  SeveritySelect,
  severityBadgeVariant,
} from "@/features/intelligence/components/severity-status-selects";
import { dispatchRiskStateChanged } from "@/features/intelligence/lib/risk-state-events";
import type { ChatCitation } from "@/lib/ai/citations";

import type { RiskRegisterRow } from "../lib/assemble-shared";
import { humanizeLabel, resolveCitationIndex } from "../lib/assemble-shared";

const STATUS_OPTIONS: RiskStatus[] = ["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"];

type ReportRiskRegisterProps = {
  rows: RiskRegisterRow[];
  projectId: string;
  projectName?: string;
  citations: ChatCitation[];
  onCitationFocus?: (index: number) => void;
};

export function parseRiskRegisterRowsFromMarkdown(content: string): RiskRegisterRow[] {
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

    const docMatch = citation?.match(/doc:([^\s/]+)/);
    const chunkMatch = citation?.match(/chunk:([^\s)/]+)/);
    const indexMatch = citation?.match(/^\[(\d+)\]/);

    rows.push({
      severity: (severity as FindingSeverity | "UNKNOWN") || "UNKNOWN",
      category: humanizeLabel(category ?? ""),
      agent: humanizeLabel(agent ?? ""),
      title,
      description: "",
      citation: citation ?? "—",
      citationIndex: indexMatch ? Number(indexMatch[1]) : null,
      documentId: docMatch?.[1] ?? null,
      chunkId: chunkMatch?.[1] ?? null,
      status: humanizeLabel(status ?? "OPEN"),
      score: null,
      remediation:
        "Confirm the cited evidence, assign an owner and due date, document remediation, then update status when residual risk is agreed.",
    });
  }
  return rows;
}

function normalizeStatus(value: string): RiskStatus {
  const upper = value.replace(/\s+/g, "_").toUpperCase();
  if (STATUS_OPTIONS.includes(upper as RiskStatus)) return upper as RiskStatus;
  return "OPEN";
}

export function ReportRiskRegister({
  rows,
  projectId,
  citations,
  onCitationFocus,
}: ReportRiskRegisterProps) {
  const [statuses, setStatuses] = useState<Record<string, RiskStatus>>(() => {
    const initial: Record<string, RiskStatus> = {};
    for (const row of rows) {
      if (row.findingId) initial[row.findingId] = normalizeStatus(row.status);
    }
    return initial;
  });
  const [severities, setSeverities] = useState<Record<string, FindingSeverity | "UNKNOWN">>(() => {
    const initial: Record<string, FindingSeverity | "UNKNOWN"> = {};
    for (const row of rows) {
      if (row.findingId) initial[row.findingId] = row.severity;
    }
    return initial;
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateStatus(findingId: string, status: RiskStatus) {
    setSavingId(findingId);
    const previous = statuses[findingId];
    setStatuses((prev) => ({ ...prev, [findingId]: status }));
    try {
      const res = await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setStatuses((prev) => ({ ...prev, [findingId]: previous ?? "OPEN" }));
        toast.error(json.error?.message ?? "Failed to update status");
        return;
      }
      dispatchRiskStateChanged({
        projectId,
        entity: "finding",
        id: findingId,
        status,
      });
      toast.success(`Marked ${status.toLowerCase().replace(/_/g, " ")}`);
    } catch {
      setStatuses((prev) => ({ ...prev, [findingId]: previous ?? "OPEN" }));
      toast.error("Failed to update status");
    } finally {
      setSavingId(null);
    }
  }

  async function updateSeverity(findingId: string, severity: FindingSeverity) {
    setSavingId(findingId);
    const previous = severities[findingId];
    setSeverities((prev) => ({ ...prev, [findingId]: severity }));
    try {
      const res = await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setSeverities((prev) => ({ ...prev, [findingId]: previous ?? "UNKNOWN" }));
        toast.error(json.error?.message ?? "Failed to update severity");
        return;
      }
      dispatchRiskStateChanged({
        projectId,
        entity: "finding",
        id: findingId,
        severity,
      });
      toast.success(`Severity set to ${severity.toLowerCase()}`);
    } catch {
      setSeverities((prev) => ({ ...prev, [findingId]: previous ?? "UNKNOWN" }));
      toast.error("Failed to update severity");
    } finally {
      setSavingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 px-5 py-10 text-center text-sm text-muted-foreground">
        No open findings were available for this risk register.
      </div>
    );
  }

  const criticalHigh = rows.filter(
    (row) => row.severity === "CRITICAL" || row.severity === "HIGH",
  ).length;

  return (
    <div className="space-y-5 report-print-stack">
      <section className="rounded-2xl border border-border/60 bg-muted/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-semibold tracking-tight">Risk overview</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {rows.length} open finding{rows.length === 1 ? "" : "s"}
              {criticalHigh > 0 ? ` · ${criticalHigh} critical/high` : ""}. Update status when
              owners acknowledge or close residual risk — changes persist on the finding.
            </p>
          </div>
        </div>
      </section>

      <ol className="space-y-4">
        {rows.map((row, index) => {
          const citationIndex =
            row.citationIndex ?? resolveCitationIndex(row.documentId, row.chunkId, citations);
          const citation = citationIndex != null ? citations[citationIndex - 1] : undefined;
          const href =
            citation != null
              ? dataRoomCitationHref(projectId, citation, citationIndex ?? 0)
              : row.documentId
                ? `/dashboard/projects/${projectId}/data-room?doc=${row.documentId}${
                    row.chunkId ? `&chunk=${row.chunkId}` : ""
                  }`
                : null;
          const status = row.findingId
            ? (statuses[row.findingId] ?? normalizeStatus(row.status))
            : normalizeStatus(row.status);
          const severity = row.findingId
            ? (severities[row.findingId] ?? row.severity)
            : row.severity;

          return (
            <li
              key={row.findingId ?? `${row.title}-${index}`}
              className="report-print-card break-inside-avoid rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Finding {index + 1}
                  </p>
                  <h4 className="font-display text-base font-semibold tracking-tight text-foreground">
                    {row.title}
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.findingId ? (
                    <SeveritySelect
                      value={severity === "UNKNOWN" ? null : severity}
                      disabled={savingId === row.findingId}
                      ariaLabel={`Severity for ${row.title}`}
                      onChange={(value) => void updateSeverity(row.findingId!, value)}
                      className="report-print-hide"
                    />
                  ) : (
                    <Badge variant={severityBadgeVariant(severity)}>{severity}</Badge>
                  )}
                  <Badge
                    variant={severityBadgeVariant(severity)}
                    className="hidden print:inline-flex"
                  >
                    {severity}
                  </Badge>
                  {row.findingId ? (
                    <RiskStatusSelect
                      value={status}
                      disabled={savingId === row.findingId}
                      ariaLabel={`Status for ${row.title}`}
                      onChange={(value) => void updateStatus(row.findingId!, value)}
                      className="report-print-hide"
                    />
                  ) : (
                    <Badge variant="outline" className="border-border/60 normal-case tracking-normal">
                      {row.status}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="hidden border-border/60 normal-case tracking-normal print:inline-flex"
                  >
                    {status}
                  </Badge>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </dt>
                  <dd className="mt-1 text-foreground/90">{row.category}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Agent
                  </dt>
                  <dd className="mt-1 text-foreground/90">{row.agent}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Evidence
                  </dt>
                  <dd className="mt-1">
                    {href ? (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {citationIndex != null ? `[${citationIndex}] ` : null}
                          {citation?.documentName ?? "Open in data room"}
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                        {citationIndex != null && onCitationFocus ? (
                          <button
                            type="button"
                            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                            onClick={() => onCitationFocus(citationIndex)}
                          >
                            View in panel
                          </button>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No linked citation</span>
                    )}
                  </dd>
                </div>
              </dl>

              {row.description ? (
                <div className="mt-4 rounded-xl border border-border/50 bg-muted/15 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Context
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-foreground/85">{row.description}</p>
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  How to close
                </p>
                <p className="mt-1.5 text-sm leading-6 text-foreground/85">{row.remediation}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="report-print-hide flex items-center gap-2 text-xs text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
        Markdown / Excel exports still include a compact table for spreadsheet workflows.
      </div>
    </div>
  );
}
