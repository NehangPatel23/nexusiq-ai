"use client";

import type { ContradictionFactType, ContradictionStatus, FindingSeverity } from "@prisma/client";
import {
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  FileWarning,
  GitCompareArrows,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectTabHeader } from "@/features/projects/components/project-tab-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContradictionView } from "@/features/contradictions/lib/contradictions";
import { findValueMatch } from "@/features/contradictions/lib/excerpt-match";
import { AgentThinking } from "@/features/intelligence/components/agent-thinking";
import {
  ContradictionStatusSelect,
  SeveritySelect,
  severityBadgeVariant,
} from "@/features/intelligence/components/severity-status-selects";
import { dispatchRiskStateChanged } from "@/features/intelligence/lib/risk-state-events";
import { useBackgroundExtract } from "@/features/projects/hooks/use-background-extract";
import { startBackgroundExtract } from "@/features/projects/lib/background-extract-runner";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const STATUS_FILTER_OPTIONS: ContradictionStatus[] = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "DISMISSED",
];

const FACT_TYPE_LABEL: Record<string, string> = {
  DATE: "Date",
  AMOUNT: "Amount",
  PARTY: "Party",
  METRIC: "Metric",
  OTHER: "Other",
};

const FACT_TYPE_FILTER_OPTIONS: ContradictionFactType[] = [
  "DATE",
  "AMOUNT",
  "PARTY",
  "METRIC",
  "OTHER",
];

const BULK_STATUS_OPTIONS: ContradictionStatus[] = [
  "ACKNOWLEDGED",
  "RESOLVED",
  "DISMISSED",
];

function highlightExcerpt(
  text: string,
  value: string,
  tone: "a" | "b",
  factType?: string,
  preferredMatch?: string | null,
) {
  let matchIndex = -1;
  let matchLength = 0;

  if (preferredMatch) {
    matchIndex = text.toLowerCase().indexOf(preferredMatch.toLowerCase());
    if (matchIndex >= 0) matchLength = preferredMatch.length;
  }

  if (matchIndex < 0) {
    const match = findValueMatch(text, value, factType);
    if (match) {
      matchIndex = match.index;
      matchLength = match.length;
    }
  }

  if (matchIndex < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, matchIndex)}
      <mark
        className={cn(
          "rounded px-1 py-0.5 font-semibold not-italic",
          tone === "a"
            ? "bg-rose-500/30 text-rose-100 ring-1 ring-rose-400/40"
            : "bg-sky-500/30 text-sky-100 ring-1 ring-sky-400/40",
        )}
      >
        {text.slice(matchIndex, matchIndex + matchLength)}
      </mark>
      {text.slice(matchIndex + matchLength)}
    </>
  );
}

function FormattedExcerpt({
  text,
  value,
  tone,
  factType,
  matchedText,
  matched,
}: {
  text: string;
  value: string;
  tone: "a" | "b";
  factType?: string;
  matchedText?: string | null;
  matched?: boolean;
}) {
  const focused = text.trim().replace(/\s+/g, " ");
  const lines = focused
    .split(/\s*\|\s*|(?<=[.!?])\s+(?=[A-Z0-9$])/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <div className="space-y-3">
      {matched === false ? (
        <p
          role="status"
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs leading-relaxed text-amber-100"
        >
          The stated value wasn&apos;t found in the linked source excerpt. Open the document
          to verify the citation.
        </p>
      ) : null}
      {lines.length <= 1 ? (
        <p className="text-sm leading-relaxed text-foreground/85">
          {highlightExcerpt(focused, value, tone, factType, matchedText)}
        </p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line, index) => (
            <li
              key={`${index}-${line.slice(0, 24)}`}
              className="flex gap-2.5 text-sm leading-relaxed"
            >
              <span
                className={cn(
                  "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                  tone === "a" ? "bg-rose-400/70" : "bg-sky-400/70",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 text-foreground/85">
                {highlightExcerpt(line, value, tone, factType, matchedText)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function dataRoomDocHref(
  projectId: string,
  documentId: string,
  options?: { chunkId?: string; highlight?: string },
) {
  const params = new URLSearchParams({ doc: documentId });
  if (options?.chunkId) params.set("chunk", options.chunkId);
  if (options?.highlight) {
    params.set("highlight", options.highlight.slice(0, 120));
  }
  return `/dashboard/projects/${projectId}/data-room?${params.toString()}`;
}

type ContradictionsPageProps = {
  projectId: string;
  projectName: string;
  initialContradictions: ContradictionView[];
  readyDocumentCount: number;
};

export function ContradictionsPageClient({
  projectId,
  projectName,
  initialContradictions,
  readyDocumentCount,
}: ContradictionsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const extract = useBackgroundExtract(projectId, "contradictions");
  const scanning = extract.status === "running";
  const ollamaDown = extract.ollamaUnavailable;
  const prevScanStatus = useRef(extract.status);
  const [rows, setRows] = useState(initialContradictions);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [factTypeFilter, setFactTypeFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ContradictionStatus>("ACKNOWLEDGED");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  useEffect(() => {
    setResolutionNote(selected?.resolutionNote ?? "");
  }, [selected?.id, selected?.resolutionNote]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (severityFilter !== "all" && row.severity !== severityFilter) return false;
      if (factTypeFilter !== "all" && row.factType !== factTypeFilter) return false;
      return true;
    });
  }, [rows, statusFilter, severityFilter, factTypeFilter]);

  useEffect(() => {
    setCheckedIds((prev) => {
      const visibleIds = new Set(filtered.map((row) => row.id));
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  const allFilteredChecked = filtered.length > 0 && filtered.every((row) => checkedIds.has(row.id));
  const someFilteredChecked = filtered.some((row) => checkedIds.has(row.id));

  const stats = useMemo(() => {
    const open = rows.filter((r) => r.status === "OPEN").length;
    const critical = rows.filter(
      (r) => r.status === "OPEN" && (r.severity === "CRITICAL" || r.severity === "HIGH"),
    ).length;
    const acknowledged = rows.filter((r) => r.status === "ACKNOWLEDGED").length;
    const resolved = rows.filter(
      (r) => r.status === "RESOLVED" || r.status === "DISMISSED",
    ).length;
    const latest = rows.reduce<string | null>((acc, row) => {
      if (!acc || row.updatedAt > acc) return row.updatedAt;
      return acc;
    }, null);
    return { open, critical, acknowledged, resolved, total: rows.length, latest };
  }, [rows]);

  async function refreshRows() {
    const listRes = await fetch(`/api/projects/${projectId}/contradictions`);
    const listJson = (await listRes.json()) as ApiEnvelope<{
      contradictions: ContradictionView[];
    }>;
    if (listJson.success) setRows(listJson.data.contradictions);
  }

  function runScan(force = false) {
    startBackgroundExtract({
      projectId,
      kind: "contradictions",
      force,
    });
  }

  useEffect(() => {
    if (prevScanStatus.current === "running" && extract.status === "idle") {
      void refreshRows();
      startTransition(() => router.refresh());
    }
    prevScanStatus.current = extract.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh only on status transitions
  }, [extract.status]);

  useEffect(() => {
    if (searchParams.get("scan") === "1") {
      runScan(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("scan");
      router.replace(url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on ?scan=1
  }, []);

  async function updateStatus(id: string, status: ContradictionStatus) {
    setSavingId(id);
    const previous = rows.find((r) => r.id === id)?.status;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch(`/api/contradictions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as ApiEnvelope<{
        contradiction: { status: ContradictionStatus };
      }>;
      if (!res.ok || !json.success) {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: previous ?? "OPEN" } : r)),
        );
        toast.error(!json.success ? json.error.message : "Failed to update status");
        return;
      }
      dispatchRiskStateChanged({
        projectId,
        entity: "contradiction",
        id,
        status,
      });
      toast.success(`Marked ${status.toLowerCase().replace(/_/g, " ")}`);
    } catch {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: previous ?? "OPEN" } : r)),
      );
      toast.error("Failed to update status");
    } finally {
      setSavingId(null);
    }
  }

  async function updateSeverity(id: string, severity: FindingSeverity) {
    setSavingId(id);
    const previous = rows.find((r) => r.id === id)?.severity;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, severity } : r)));
    try {
      const res = await fetch(`/api/contradictions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity }),
      });
      const json = (await res.json()) as ApiEnvelope<{
        contradiction: { severity: FindingSeverity };
      }>;
      if (!res.ok || !json.success) {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, severity: previous ?? "MEDIUM" } : r)),
        );
        toast.error(!json.success ? json.error.message : "Failed to update severity");
        return;
      }
      dispatchRiskStateChanged({
        projectId,
        entity: "contradiction",
        id,
        severity,
      });
      toast.success(`Severity set to ${severity.toLowerCase()}`);
    } catch {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, severity: previous ?? "MEDIUM" } : r)),
      );
      toast.error("Failed to update severity");
    } finally {
      setSavingId(null);
    }
  }

  function toggleCheck(id: string, checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleCheckAll(checked: boolean) {
    setCheckedIds(checked ? new Set(filtered.map((row) => row.id)) : new Set());
  }

  async function applyBulkStatus() {
    if (checkedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(checkedIds);
    try {
      const res = await fetch(`/api/projects/${projectId}/contradictions/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: bulkStatus }),
      });
      const json = (await res.json()) as ApiEnvelope<{ updated: number }>;
      if (!res.ok || !json.success) {
        toast.error(!json.success ? json.error.message : "Bulk update failed");
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          checkedIds.has(row.id)
            ? { ...row, status: bulkStatus, statusChangedAt: new Date().toISOString() }
            : row,
        ),
      );
      for (const id of ids) {
        dispatchRiskStateChanged({ projectId, entity: "contradiction", id, status: bulkStatus });
      }
      toast.success(
        `Updated ${json.data.updated} contradiction${json.data.updated === 1 ? "" : "s"}`,
      );
      setCheckedIds(new Set());
    } catch {
      toast.error("Bulk update failed");
    } finally {
      setBulkUpdating(false);
    }
  }

  async function saveResolutionNote() {
    if (!selected) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/contradictions/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNote: resolutionNote.trim() || null }),
      });
      const json = (await res.json()) as ApiEnvelope<{
        contradiction: { resolutionNote: string | null; statusChangedAt: string | null };
      }>;
      if (!res.ok || !json.success) {
        toast.error(!json.success ? json.error.message : "Failed to save note");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? {
                ...r,
                resolutionNote: json.data.contradiction.resolutionNote,
                statusChangedAt: json.data.contradiction.statusChangedAt,
              }
            : r,
        ),
      );
      toast.success("Resolution note saved");
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSavingNote(false);
    }
  }

  async function promoteToFinding() {
    if (!selected) return;
    setPromoting(true);
    try {
      const res = await fetch(`/api/contradictions/${selected.id}/promote`, {
        method: "POST",
      });
      const json = (await res.json()) as ApiEnvelope<{
        promotedFindingId: string;
        created: boolean;
      }>;
      if (!res.ok || !json.success) {
        toast.error(!json.success ? json.error.message : "Failed to promote to finding");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === selected.id ? { ...r, promotedFindingId: json.data.promotedFindingId } : r,
        ),
      );
      toast.success(json.data.created ? "Promoted to a risk finding" : "Already promoted");
    } catch {
      toast.error("Failed to promote to finding");
    } finally {
      setPromoting(false);
    }
  }

  const insufficientDocs = readyDocumentCount < 2;

  return (
    <div className="space-y-6">
      <ProjectTabHeader
        icon={AlertTriangle}
        title="Contradictions"
        description={`Cross-document fact conflicts for ${projectName}`}
      >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scanning || insufficientDocs}
            onClick={() => runScan(true)}
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Scan again
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={scanning || insufficientDocs}
            onClick={() => runScan(false)}
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Run contradiction scan
          </Button>
      </ProjectTabHeader>

      {!insufficientDocs && rows.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Open conflicts",
              value: stats.open,
              hint: stats.latest ? `Updated ${formatRelativeTime(stats.latest)}` : "No scans yet",
              tone: "text-sky-300",
            },
            {
              label: "Critical / high",
              value: stats.critical,
              hint: "Need diligence attention",
              tone: "text-rose-300",
            },
            {
              label: "Acknowledged",
              value: stats.acknowledged,
              hint: "Under review",
              tone: "text-primary",
            },
            {
              label: "Closed",
              value: stats.resolved,
              hint: `${stats.total} total found`,
              tone: "text-emerald-300",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border/60 bg-card/40 px-4 py-3"
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <p className={cn("mt-1 font-display text-2xl font-semibold tabular-nums", card.tone)}>
                {card.value}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{card.hint}</p>
            </div>
          ))}
        </div>
      ) : null}

      {scanning ? (
        <AgentThinking label="Comparing facts across documents…" />
      ) : null}

      {ollamaDown ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Ollama unavailable</p>
            <p className="mt-0.5 text-amber-100/80">
              Contradiction scan needs a reachable Ollama endpoint. List and status updates still
              work offline.
            </p>
          </div>
        </div>
      ) : null}

      {insufficientDocs ? (
        <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-8 text-center">
          <FileWarning className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">Need at least two processed documents</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload and process documents in the data room, then scan again.
          </p>
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href={`/dashboard/projects/${projectId}/data-room`}>Open data room</Link>
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[160px]" aria-label="Filter by severity">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={factTypeFilter} onValueChange={setFactTypeFilter}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by fact type">
              <SelectValue placeholder="Fact type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All fact types</SelectItem>
              {FACT_TYPE_FILTER_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {FACT_TYPE_LABEL[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filtered.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {rows.length}
          </p>
        ) : null}
      </div>

      {someFilteredChecked ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <p className="text-sm font-medium">
            {checkedIds.size} selected
          </p>
          <Select
            value={bulkStatus}
            onValueChange={(value) => setBulkStatus(value as ContradictionStatus)}
          >
            <SelectTrigger className="w-[170px]" aria-label="Bulk status to apply">
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              {BULK_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  Mark {s.replace(/_/g, " ").toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            disabled={bulkUpdating}
            onClick={() => void applyBulkStatus()}
          >
            {bulkUpdating ? (
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
            ) : null}
            Apply to {checkedIds.size}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setCheckedIds(new Set())}
          >
            <X className="h-3.5 w-3.5" />
            Clear selection
          </Button>
        </div>
      ) : null}

      {!insufficientDocs && filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
          <GitCompareArrows className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">No contradictions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run a scan to compare facts across documents. You can leave this tab — the scan
            continues in the background.
          </p>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={allFilteredChecked ? true : someFilteredChecked ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleCheckAll(checked === true)}
                    aria-label="Select all contradictions"
                  />
                </th>
                <th className="px-4 py-2.5 font-medium">Conflict</th>
                <th className="px-4 py-2.5 font-medium">Sources</th>
                <th className="px-4 py-2.5 font-medium">Severity</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/20"
                  onClick={() => setSelectedId(row.id)}
                >
                  <td className="px-3 py-3.5 align-top" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={checkedIds.has(row.id)}
                      onCheckedChange={(checked) => toggleCheck(row.id, checked === true)}
                      aria-label={`Select ${row.subject}`}
                    />
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{row.subject}</p>
                      <Badge variant="outline" className="font-normal">
                        {FACT_TYPE_LABEL[row.factType] ?? row.factType}
                      </Badge>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {row.explanation}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-xs">
                      <span className="rounded-md border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-rose-200">
                        {row.valueA}
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="rounded-md border border-sky-500/25 bg-sky-500/10 px-1.5 py-0.5 text-sky-200">
                        {row.valueB}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="space-y-1.5 text-xs">
                      <p className="flex items-start gap-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                        <span className="line-clamp-1 text-muted-foreground">{row.documentAName}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                        <span className="line-clamp-1 text-muted-foreground">{row.documentBName}</span>
                      </p>
                      <p className="pt-0.5 text-[11px] text-muted-foreground/80">
                        Found {formatRelativeTime(row.createdAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top" onClick={(e) => e.stopPropagation()}>
                    <SeveritySelect
                      value={row.severity}
                      disabled={savingId === row.id}
                      ariaLabel={`Severity for ${row.subject}`}
                      onChange={(value) => void updateSeverity(row.id, value)}
                      allowEmptyPlaceholder={false}
                    />
                  </td>
                  <td className="px-4 py-3.5 align-top" onClick={(e) => e.stopPropagation()}>
                    <ContradictionStatusSelect
                      value={row.status}
                      disabled={savingId === row.id}
                      ariaLabel={`Status for ${row.subject}`}
                      onChange={(value) => void updateStatus(row.id, value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader className="space-y-3 pr-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={severityBadgeVariant(selected.severity)}>
                    {selected.severity}
                  </Badge>
                  <Badge variant="outline">
                    {FACT_TYPE_LABEL[selected.factType] ?? selected.factType}
                  </Badge>
                  <Badge variant="secondary" className="normal-case tracking-normal">
                    {selected.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </div>
                <DialogTitle className="font-display text-xl leading-snug">
                  {selected.subject}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-foreground/80">
                  {selected.explanation}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Severity
                    </p>
                    <div className="mt-1.5">
                      <SeveritySelect
                        value={selected.severity}
                        disabled={savingId === selected.id}
                        ariaLabel={`Severity for ${selected.subject}`}
                        onChange={(value) => void updateSeverity(selected.id, value)}
                        allowEmptyPlaceholder={false}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </p>
                    <div className="mt-1.5">
                      <ContradictionStatusSelect
                        value={selected.status}
                        disabled={savingId === selected.id}
                        ariaLabel={`Status for ${selected.subject}`}
                        onChange={(value) => void updateStatus(selected.id, value)}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Detected {formatRelativeTime(selected.createdAt)}
                  {selected.updatedAt !== selected.createdAt
                    ? ` · Updated ${formatRelativeTime(selected.updatedAt)}`
                    : ""}
                  {selected.statusChangedAt
                    ? ` · Status changed ${formatRelativeTime(selected.statusChangedAt)}`
                    : ""}
                </p>
              </div>

              <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-muted/10 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="contradiction-resolution-note"
                    className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Resolution note
                  </label>
                  {selected.promotedFindingId ? (
                    <Link
                      href={`/dashboard/projects/${projectId}/risks`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      View promoted finding
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
                <textarea
                  id="contradiction-resolution-note"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={3}
                  placeholder="Document how this conflict was resolved…"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={
                      savingNote || (resolutionNote.trim() || "") === (selected.resolutionNote ?? "")
                    }
                    onClick={() => void saveResolutionNote()}
                  >
                    {savingNote ? <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" /> : null}
                    Save note
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={promoting || Boolean(selected.promotedFindingId)}
                    onClick={() => void promoteToFinding()}
                  >
                    {promoting ? (
                      <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5" />
                    )}
                    {selected.promotedFindingId ? "Promoted to finding" : "Promote to finding"}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-rose-500/25 bg-gradient-to-b from-rose-500/10 to-card/40">
                  <div className="flex items-center justify-between gap-2 border-b border-rose-500/20 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-rose-300/90">
                        Document A
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium">{selected.documentAName}</p>
                    </div>
                    <Button asChild size="sm" variant="ghost" className="shrink-0">
                      <Link
                        href={dataRoomDocHref(projectId, selected.documentAId, {
                          chunkId: selected.chunkAId,
                          highlight: selected.valueAMatchedText ?? selected.valueA,
                        })}
                      >
                        Open in data room
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-rose-300/80">
                        Conflicting value
                      </p>
                      <p className="mt-1 font-mono text-lg font-semibold text-rose-100">
                        {selected.valueA}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-3">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Source excerpt
                      </p>
                      {selected.chunkAExcerpt ? (
                        <FormattedExcerpt
                          text={selected.chunkAExcerpt}
                          value={selected.valueA}
                          tone="a"
                          factType={selected.factType}
                          matched={selected.valueAMatched}
                          matchedText={selected.valueAMatchedText}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Excerpt unavailable</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-sky-500/25 bg-gradient-to-b from-sky-500/10 to-card/40">
                  <div className="flex items-center justify-between gap-2 border-b border-sky-500/20 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-sky-300/90">
                        Document B
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium">{selected.documentBName}</p>
                    </div>
                    <Button asChild size="sm" variant="ghost" className="shrink-0">
                      <Link
                        href={dataRoomDocHref(projectId, selected.documentBId, {
                          chunkId: selected.chunkBId,
                          highlight: selected.valueBMatchedText ?? selected.valueB,
                        })}
                      >
                        Open in data room
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-sky-300/80">
                        Conflicting value
                      </p>
                      <p className="mt-1 font-mono text-lg font-semibold text-sky-100">
                        {selected.valueB}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-3">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Source excerpt
                      </p>
                      {selected.chunkBExcerpt ? (
                        <FormattedExcerpt
                          text={selected.chunkBExcerpt}
                          value={selected.valueB}
                          tone="b"
                          factType={selected.factType}
                          matched={selected.valueBMatched}
                          matchedText={selected.valueBMatchedText}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Excerpt unavailable</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
