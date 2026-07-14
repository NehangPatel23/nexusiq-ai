"use client";

import type { AgentType, FindingSeverity, RiskStatus } from "@prisma/client";
import {
  AlertTriangle,
  ExternalLink,
  FileQuestion,
  FileWarning,
  ListChecks,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectTabHeader } from "@/features/projects/components/project-tab-header";
import { AgentScoreGauge } from "@/features/intelligence/components/agent-score-gauge";
import { ProjectRiskSummary } from "@/features/intelligence/components/project-risk-summary";
import {
  RISK_STATUS_OPTIONS,
  RiskStatusSelect,
  SeveritySelect,
} from "@/features/intelligence/components/severity-status-selects";
import { dispatchRiskStateChanged, subscribeRiskStateChanged } from "@/features/intelligence/lib/risk-state-events";
import {
  EMPTY_SEVERITY_COUNTS,
  type FindingSeverityCounts,
} from "@/features/intelligence/lib/severity-summary";
import type { RisksSummary } from "@/features/risks/lib/risks-summary";
import { cn } from "@/lib/utils";

const AGENT_FILTERS: Array<AgentType | "ALL"> = [
  "ALL",
  "FINANCIAL",
  "LEGAL",
  "COMPLIANCE",
  "RISK",
  "FRAUD",
  "EXECUTIVE",
];

const SEVERITY_FILTERS: Array<FindingSeverity | "ALL"> = [
  "ALL",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

function recomputeSeverityCounts(
  findings: RisksSummary["findings"],
): FindingSeverityCounts {
  const counts = { ...EMPTY_SEVERITY_COUNTS };
  for (const finding of findings) {
    if (finding.status !== "OPEN") continue;
    switch (finding.severity) {
      case "CRITICAL":
        counts.critical += 1;
        break;
      case "HIGH":
        counts.high += 1;
        break;
      case "MEDIUM":
        counts.medium += 1;
        break;
      case "LOW":
        counts.low += 1;
        break;
      default:
        break;
    }
  }
  return counts;
}

type RisksPageProps = {
  projectId: string;
  projectName: string;
  initialSummary: RisksSummary;
};

export function RisksPageClient({
  projectId,
  projectName,
  initialSummary,
}: RisksPageProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [agentFilter, setAgentFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  useEffect(() => {
    return subscribeRiskStateChanged((detail) => {
      if (detail.projectId !== projectId || detail.entity !== "finding") return;
      void (async () => {
        const res = await fetch(`/api/projects/${projectId}/risks/summary`);
        const json = (await res.json()) as {
          success: boolean;
          data?: { summary: RisksSummary };
        };
        if (json.success && json.data?.summary) {
          setSummary(json.data.summary);
        }
      })();
    });
  }, [projectId]);

  const filtered = useMemo(() => {
    return summary.findings.filter((f) => {
      if (agentFilter !== "ALL" && f.agentType !== agentFilter) return false;
      if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      return true;
    });
  }, [summary.findings, agentFilter, severityFilter, statusFilter]);

  async function updateStatus(findingId: string, status: RiskStatus) {
    setSavingId(findingId);
    const previous = summary.findings.find((f) => f.id === findingId)?.status;
    setSummary((prev) => {
      const findings = prev.findings.map((f) =>
        f.id === findingId ? { ...f, status } : f,
      );
      return {
        ...prev,
        findings,
        severityCounts: recomputeSeverityCounts(findings),
        openFindingCount: findings.filter((f) => f.status === "OPEN").length,
      };
    });
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
        setSummary((prev) => {
          const findings = prev.findings.map((f) =>
            f.id === findingId ? { ...f, status: previous ?? "OPEN" } : f,
          );
          return {
            ...prev,
            findings,
            severityCounts: recomputeSeverityCounts(findings),
            openFindingCount: findings.filter((f) => f.status === "OPEN").length,
          };
        });
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
      setSummary((prev) => {
        const findings = prev.findings.map((f) =>
          f.id === findingId ? { ...f, status: previous ?? "OPEN" } : f,
        );
        return {
          ...prev,
          findings,
          severityCounts: recomputeSeverityCounts(findings),
          openFindingCount: findings.filter((f) => f.status === "OPEN").length,
        };
      });
      toast.error("Failed to update status");
    } finally {
      setSavingId(null);
    }
  }

  async function updateSeverity(findingId: string, severity: FindingSeverity) {
    setSavingId(findingId);
    const previous = summary.findings.find((f) => f.id === findingId)?.severity ?? null;
    setSummary((prev) => {
      const findings = prev.findings.map((f) =>
        f.id === findingId ? { ...f, severity } : f,
      );
      return {
        ...prev,
        findings,
        severityCounts: recomputeSeverityCounts(findings),
      };
    });
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
        setSummary((prev) => {
          const findings = prev.findings.map((f) =>
            f.id === findingId ? { ...f, severity: previous } : f,
          );
          return {
            ...prev,
            findings,
            severityCounts: recomputeSeverityCounts(findings),
          };
        });
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
      setSummary((prev) => {
        const findings = prev.findings.map((f) =>
          f.id === findingId ? { ...f, severity: previous } : f,
        );
        return {
          ...prev,
          findings,
          severityCounts: recomputeSeverityCounts(findings),
        };
      });
      toast.error("Failed to update severity");
    } finally {
      setSavingId(null);
    }
  }

  const heatmapEntries =
    summary.categoryScores && Object.keys(summary.categoryScores).length > 0
      ? Object.entries(summary.categoryScores).sort((a, b) => b[1] - a[1])
      : summary.categoryBreakdown.map((row) => [row.category, row.count] as const);

  if (!summary.hasAgentRuns) {
    return (
      <div className="space-y-6">
        <ProjectTabHeader
          icon={ShieldAlert}
          title="Risks"
          description={`Enterprise risk overview for ${projectName}`}
        />
        <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">Run Intelligence agents first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Risk scores and open findings appear after specialist agents complete.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/dashboard/projects/${projectId}/intelligence`}>Open Intelligence</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectTabHeader
        icon={ShieldAlert}
        title="Risks"
        description={`Synthesis across agent findings for ${projectName}`}
      >
          {summary.contradictionOpenCount > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/projects/${projectId}/contradictions`}>
                <AlertTriangle className="h-4 w-4" />
                {summary.contradictionOpenCount} open contradiction
                {summary.contradictionOpenCount === 1 ? "" : "s"}
              </Link>
            </Button>
          ) : null}
          {summary.missingOpenCount > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/projects/${projectId}/missing`}>
                <FileQuestion className="h-4 w-4" />
                {summary.missingOpenCount} missing item
                {summary.missingOpenCount === 1 ? "" : "s"}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/projects/${projectId}/reports?type=RISK_REGISTER`}>
              <ListChecks className="h-4 w-4" />
              Risk Register
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/dashboard/projects/${projectId}/intelligence`}>
              Intelligence
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
      </ProjectTabHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <AgentScoreGauge
            score={summary.enterpriseRiskScore}
            label="Enterprise risk score"
            description={
              summary.scoreSource === "risk_agent"
                ? "From latest Risk agent run"
                : summary.scoreSource === "composite"
                  ? "Composite from open finding severities"
                  : "Unavailable"
            }
          />
        </div>
        <ProjectRiskSummary counts={summary.severityCounts} />
      </div>

      {summary.consensus ? (
        <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Latest consensus · {summary.consensus.decisionConfidence}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">
            {summary.consensus.finalRecommendation}
            {summary.consensus.finalRecommendation.length >= 400 ? "…" : ""}
          </p>
        </div>
      ) : null}

      {heatmapEntries.length > 0 ? (
        <section aria-label="Risk category breakdown" className="space-y-3">
          <h2 className="text-sm font-medium">Category heatmap</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {heatmapEntries.map(([category, value]) => {
              const pct =
                typeof value === "number" && summary.categoryScores
                  ? Math.max(0, Math.min(100, value))
                  : Math.min(
                      100,
                      Math.round(
                        (Number(value) / Math.max(summary.openFindingCount, 1)) * 100,
                      ),
                    );
              return (
                <li
                  key={String(category)}
                  className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate capitalize text-muted-foreground">
                      {String(category).replace(/_/g, " ")}
                    </span>
                    <span className="tabular-nums font-medium">{value}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        pct >= 70 ? "bg-rose-500" : pct >= 40 ? "bg-amber-500" : "bg-emerald-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by agent">
            <SelectValue placeholder="Agent" />
          </SelectTrigger>
          <SelectContent>
            {AGENT_FILTERS.map((a) => (
              <SelectItem key={a} value={a}>
                {a === "ALL" ? "All agents" : a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by severity">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All severities" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {RISK_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
          <FileWarning className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No findings match these filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Finding</th>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 font-medium">Severity</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/40">
                  <td className="px-3 py-3">
                    <p className="font-medium">{row.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {row.category} · {row.description}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{row.agentType}</td>
                  <td className="px-3 py-3">
                    <SeveritySelect
                      value={row.severity}
                      disabled={savingId === row.id}
                      ariaLabel={`Severity for ${row.title}`}
                      onChange={(value) => void updateSeverity(row.id, value)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <RiskStatusSelect
                      value={row.status}
                      disabled={savingId === row.id}
                      ariaLabel={`Status for ${row.title}`}
                      onChange={(value) => void updateStatus(row.id, value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
