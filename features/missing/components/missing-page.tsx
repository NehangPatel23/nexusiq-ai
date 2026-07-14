"use client";

import type { FindingSeverity, MissingItemStatus } from "@prisma/client";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  FileQuestion,
  FolderOpen,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectTabHeader } from "@/features/projects/components/project-tab-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MissingStatusSelect,
  SeveritySelect,
  severityBadgeVariant,
} from "@/features/intelligence/components/severity-status-selects";
import { dispatchRiskStateChanged } from "@/features/intelligence/lib/risk-state-events";
import type { MissingItemView } from "@/features/missing/lib/missing-items";
import { useBackgroundExtract } from "@/features/projects/hooks/use-background-extract";
import { startBackgroundExtract } from "@/features/projects/lib/background-extract-runner";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type MatchedDocument = { id: string; name: string };

type ChecklistRow = {
  title: string;
  category: string;
  expectedType: string;
  found: boolean;
  matchedDocumentIds: string[];
  matchedDocuments?: MatchedDocument[];
  framework: string | null;
  severity: FindingSeverity;
  expectedFolderPath?: string | null;
};

function dataRoomDocHref(projectId: string, documentId: string) {
  return `/dashboard/projects/${projectId}/data-room?doc=${documentId}`;
}

function dataRoomUploadHref(projectId: string, folderPath?: string | null) {
  const params = new URLSearchParams({ upload: "1" });
  if (folderPath) params.set("folder", folderPath);
  return `/dashboard/projects/${projectId}/data-room?${params.toString()}`;
}

function MatchedDocumentsAction({
  projectId,
  documents,
}: {
  projectId: string;
  documents: MatchedDocument[];
}) {
  if (documents.length === 0) return null;

  if (documents.length === 1) {
    return (
      <Link
        href={dataRoomDocHref(projectId, documents[0]!.id)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        View matched document
        <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          View matched documents ({documents.length})
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[14rem]">
        {documents.map((doc) => (
          <DropdownMenuItem key={doc.id} asChild>
            <Link
              href={dataRoomDocHref(projectId, doc.id)}
              className="flex cursor-pointer items-center gap-2"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{doc.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const STATUS_FILTER_OPTIONS: MissingItemStatus[] = [
  "OPEN",
  "REQUESTED",
  "RESOLVED",
  "NOT_APPLICABLE",
];

const SEVERITY_BORDER: Record<FindingSeverity, string> = {
  CRITICAL: "border-l-destructive",
  HIGH: "border-l-risk-high",
  MEDIUM: "border-l-risk-medium",
  LOW: "border-l-success",
};

type MissingPageProps = {
  projectId: string;
  projectName: string;
  projectType: string;
  initialItems: MissingItemView[];
  initialChecklist: ChecklistRow[];
  readyDocumentCount: number;
};

export function MissingPageClient({
  projectId,
  projectName,
  projectType,
  initialItems,
  initialChecklist,
  readyDocumentCount,
}: MissingPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const extract = useBackgroundExtract(projectId, "missing");
  const scanning = extract.status === "running";
  const prevScanStatus = useRef(extract.status);
  const [items, setItems] = useState(initialItems);
  const [checklist, setChecklist] = useState(initialChecklist);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const autoScanFired = useRef(false);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (severityFilter !== "all" && item.severity !== severityFilter) return false;
      return true;
    });
  }, [items, statusFilter, severityFilter]);

  const folderPathByTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of checklist) {
      if (row.expectedFolderPath) map.set(row.title.trim().toLowerCase(), row.expectedFolderPath);
    }
    return map;
  }, [checklist]);

  const foundCount = checklist.filter((c) => c.found).length;
  const coveragePct =
    checklist.length > 0 ? Math.round((foundCount / checklist.length) * 100) : 0;

  const stats = useMemo(() => {
    const open = items.filter((i) => i.status === "OPEN").length;
    const requested = items.filter((i) => i.status === "REQUESTED").length;
    const critical = items.filter(
      (i) =>
        (i.status === "OPEN" || i.status === "REQUESTED") &&
        (i.severity === "CRITICAL" || i.severity === "HIGH"),
    ).length;
    const closed = items.filter(
      (i) => i.status === "RESOLVED" || i.status === "NOT_APPLICABLE",
    ).length;
    return { open, requested, critical, closed, total: items.length };
  }, [items]);

  function runScan(force = false) {
    startBackgroundExtract({ projectId, kind: "missing", force });
  }

  useEffect(() => {
    if (prevScanStatus.current === "running" && extract.status === "idle") {
      const result = extract.result as
        | { items: MissingItemView[]; checklist: ChecklistRow[] }
        | null;
      if (result?.items && result?.checklist) {
        setItems(result.items);
        setChecklist(result.checklist);
      }
      startTransition(() => router.refresh());
    }
    prevScanStatus.current = extract.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh only on status transitions
  }, [extract.status]);

  useEffect(() => {
    if (autoScanFired.current) return;
    if (searchParams.get("scan") === "1") {
      autoScanFired.current = true;
      runScan(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function updateStatus(id: string, status: MissingItemStatus) {
    setSavingId(id);
    const previous = items.find((r) => r.id === id)?.status;
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch(`/api/missing/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as ApiEnvelope<{ item: { status: MissingItemStatus } }>;
      if (!res.ok || !json.success) {
        setItems((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: previous ?? "OPEN" } : r)),
        );
        toast.error(!json.success ? json.error.message : "Failed to update status");
        return;
      }
      dispatchRiskStateChanged({
        projectId,
        entity: "missing",
        id,
        status,
      });
      toast.success(`Marked ${status.toLowerCase().replace(/_/g, " ")}`);
    } catch {
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: previous ?? "OPEN" } : r)),
      );
      toast.error("Failed to update status");
    } finally {
      setSavingId(null);
    }
  }

  async function updateSeverity(id: string, severity: FindingSeverity) {
    setSavingId(id);
    const previous = items.find((r) => r.id === id)?.severity ?? null;
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, severity } : r)));
    try {
      const res = await fetch(`/api/missing/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity }),
      });
      const json = (await res.json()) as ApiEnvelope<{
        item: { severity: FindingSeverity | null };
      }>;
      if (!res.ok || !json.success) {
        setItems((prev) =>
          prev.map((r) => (r.id === id ? { ...r, severity: previous } : r)),
        );
        toast.error(!json.success ? json.error.message : "Failed to update severity");
        return;
      }
      dispatchRiskStateChanged({
        projectId,
        entity: "missing",
        id,
        severity,
      });
      toast.success(`Severity set to ${severity.toLowerCase()}`);
    } catch {
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, severity: previous } : r)),
      );
      toast.error("Failed to update severity");
    } finally {
      setSavingId(null);
    }
  }

  async function exportRequests(format: "markdown" | "csv") {
    setExporting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/missing/export-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, statuses: ["OPEN", "REQUESTED"] }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as ApiEnvelope<unknown> | null;
        toast.error(
          json && !json.success ? json.error.message : "Export failed",
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `missing-follow-ups.${format === "csv" ? "csv" : "md"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Follow-up requests exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function copyFollowUp(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Follow-up copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="space-y-6">
      <ProjectTabHeader
        icon={FileQuestion}
        title="Missing Information"
        description={`Checklist gaps for ${projectName} (${projectType.replace(/_/g, " ")})`}
      >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exporting || items.length === 0}
            onClick={() => void exportRequests("markdown")}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export follow-ups
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={scanning}
            onClick={() => runScan(true)}
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Scan missing docs
          </Button>
      </ProjectTabHeader>

      {readyDocumentCount === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-8 text-center">
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">No processed documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload documents to the data room so checklist matching can run.
          </p>
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href={`/dashboard/projects/${projectId}/data-room`}>Open data room</Link>
          </Button>
        </div>
      ) : null}

      {items.length > 0 || checklist.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Open gaps",
              value: stats.open,
              hint: "Awaiting documents",
              tone: "text-sky-300",
            },
            {
              label: "Requested",
              value: stats.requested,
              hint: "Follow-ups sent",
              tone: "text-primary",
            },
            {
              label: "Critical / high",
              value: stats.critical,
              hint: "Active high priority",
              tone: "text-rose-300",
            },
            {
              label: "Coverage",
              value: `${coveragePct}%`,
              hint: `${foundCount}/${checklist.length || 0} checklist items`,
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

      {checklist.length > 0 ? (
        <section
          className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-4"
          aria-label="Expected vs found checklist"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Expected vs found</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Deal-type checklist matched against the data room
              </p>
            </div>
            <p className="text-xs tabular-nums text-muted-foreground">
              {foundCount}/{checklist.length} present · {coveragePct}%
            </p>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-muted/60"
            role="progressbar"
            aria-valuenow={coveragePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Checklist coverage"
          >
            <div
              className="h-full rounded-full bg-emerald-500/80 transition-all duration-500"
              style={{ width: `${coveragePct}%` }}
            />
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {checklist.map((row) => {
              const matchedDocs =
                row.matchedDocuments && row.matchedDocuments.length > 0
                  ? row.matchedDocuments
                  : row.matchedDocumentIds.map((id) => ({
                      id,
                      name: "Matched document",
                    }));

              return (
                <li
                  key={`${row.category}-${row.title}`}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
                    row.found
                      ? "border-emerald-500/25 bg-emerald-500/5"
                      : "border-amber-500/20 bg-amber-500/5",
                  )}
                >
                  {row.found ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <FileQuestion className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium">{row.title}</p>
                      {!row.found ? (
                        <Badge
                          variant={severityBadgeVariant(row.severity)}
                          className="origin-left scale-90"
                        >
                          {row.severity}
                        </Badge>
                      ) : (
                        <Badge variant="success" className="origin-left scale-90">
                          Found
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="normal-case tracking-normal">
                        {row.category}
                      </Badge>
                      {row.expectedType ? (
                        <Badge variant="outline" className="normal-case tracking-normal">
                          {row.expectedType.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                      {row.framework ? (
                        <Badge variant="outline" className="normal-case tracking-normal">
                          {row.framework}
                        </Badge>
                      ) : null}
                      {row.expectedFolderPath ? (
                        <Badge variant="outline" className="normal-case tracking-normal">
                          <FolderOpen className="mr-1 h-3 w-3" aria-hidden="true" />
                          {row.expectedFolderPath}
                        </Badge>
                      ) : null}
                    </div>
                    {row.found ? (
                      <MatchedDocumentsAction projectId={projectId} documents={matchedDocs} />
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-amber-200/80">Not found in data room</p>
                        <Link
                          href={dataRoomUploadHref(projectId, row.expectedFolderPath)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Upload to close gap
                          <Upload className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" aria-label="Filter missing items by status">
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={exporting}
            onClick={() => void exportRequests("csv")}
          >
            Export CSV
          </Button>
        </div>
        {filtered.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {items.length} · {stats.closed} closed
          </p>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">No gaps recorded</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run a missing-document scan to populate follow-up requests.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3" aria-label="Missing document gaps">
          {filtered.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-xl border border-border/60 border-l-4 bg-card/40 p-4",
                item.severity ? SEVERITY_BORDER[item.severity] : "border-l-border",
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    {item.framework ? (
                      <Badge variant="outline">{item.framework}</Badge>
                    ) : null}
                    {item.category ? (
                      <Badge variant="secondary" className="normal-case tracking-normal">
                        {item.category}
                      </Badge>
                    ) : null}
                    {item.expectedType ? (
                      <Badge variant="outline" className="normal-case tracking-normal">
                        {item.expectedType}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  {item.followUpText ? (
                    <div className="rounded-lg border border-border/50 bg-muted/25 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Suggested follow-up
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => void copyFollowUp(item.followUpText!)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                        {item.followUpText}
                      </p>
                    </div>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground/80">
                    Identified {formatRelativeTime(item.createdAt)}
                    {item.updatedAt !== item.createdAt
                      ? ` · Updated ${formatRelativeTime(item.updatedAt)}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Severity
                    </p>
                    <SeveritySelect
                      value={item.severity}
                      disabled={savingId === item.id}
                      ariaLabel={`Severity for ${item.title}`}
                      onChange={(value) => void updateSeverity(item.id, value)}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </p>
                    <MissingStatusSelect
                      value={item.status}
                      disabled={savingId === item.id}
                      ariaLabel={`Status for ${item.title}`}
                      onChange={(value) => void updateStatus(item.id, value)}
                    />
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-1">
                    <Link
                      href={dataRoomUploadHref(
                        projectId,
                        folderPathByTitle.get(item.title.trim().toLowerCase()) ?? null,
                      )}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload to data room
                    </Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
