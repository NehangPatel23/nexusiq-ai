"use client";

import type { ReportFormat, ReportType } from "@prisma/client";
import { AlertTriangle, Bot, FileText, GitCompareArrows, Loader2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProjectTabHeader } from "@/features/projects/components/project-tab-header";import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { ReportCompareDialog } from "./report-compare-dialog";
import { ReportGenerateDialog, type GenerateReportOptions } from "./report-generate-dialog";
import { ReportGenerateMenu } from "./report-generate-menu";
import { ReportGenerationModal, type GenerationStep } from "./report-generation-modal";
import { ReportHistoryTable } from "./report-history-table";
import { ReportPreview } from "./report-preview";
import { AUDIENCE_PRESETS, type AudiencePreset } from "../lib/audience-presets";
import {
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TYPE_ICONS,
  REPORT_TYPE_LABELS,
  REPORT_TYPES,
  reportTypeAccent,
} from "../lib/labels";
import type { ReportDetail, ReportSummary } from "../lib/reports";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type ReportsPageProps = {
  projectId: string;
  projectName: string;
  initialReports: ReportSummary[];
  hasIntelligence: boolean;
  hasFindings: boolean;
};

const EMPTY_CTA: Partial<
  Record<ReportType, { title: string; body: string; href: string; linkLabel: string }>
> = {
  EXECUTIVE: {
    title: "Need an executive package first",
    body: "Run Full analysis or the Executive agent so narrative reports can reuse its Markdown.",
    href: "intelligence",
    linkLabel: "Open Intelligence",
  },
  BOARD: {
    title: "Board packs need risk + executive context",
    body: "Run specialists and consensus so the board narrative and heatmap have real scores.",
    href: "intelligence",
    linkLabel: "Open Intelligence",
  },
  INVESTMENT_MEMO: {
    title: "Investment memos need diligence runs",
    body: "Generate after specialists, consensus, and executive finish so the thesis isn’t empty.",
    href: "intelligence",
    linkLabel: "Open Intelligence",
  },
  AUDIT: {
    title: "Audit reports lean on Compliance",
    body: "Run the Compliance agent to populate framework gaps and remediation.",
    href: "intelligence?tab=compliance",
    linkLabel: "Run Compliance",
  },
  RISK_REGISTER: {
    title: "Risk registers need open findings",
    body: "Run any specialist agent so findings populate the risk register and Excel export.",
    href: "intelligence",
    linkLabel: "Open Intelligence",
  },
  ACTION_PLAN: {
    title: "Action plans need priorities",
    body: "Executive priority actions and high-severity findings feed this table.",
    href: "intelligence?tab=executive",
    linkLabel: "Open Executive",
  },
  PPTX: {
    title: "Slide decks need scores + consensus",
    body: "Generate after specialists and consensus so slides include recommendations.",
    href: "intelligence",
    linkLabel: "Open Intelligence",
  },
};

export function ReportsPage({
  projectId,
  projectName,
  initialReports,
  hasIntelligence,
  hasFindings,
}: ReportsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState(initialReports);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ReportDetail | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState<GenerationStep>("assemble");
  const [genOpen, setGenOpen] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genLabel, setGenLabel] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<ReportType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState<string | null>(null);
  const autoGenerateHandled = useState({ done: false })[0];

  const refreshReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/reports`);
      const json = (await response.json()) as ApiEnvelope<{ reports: ReportSummary[] }>;
      if (!json.success) {
        toast.error(json.error.message);
        return;
      }
      setReports(json.data.reports);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const viewReport = useCallback(async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}`);
      const json = (await response.json()) as ApiEnvelope<{ report: ReportDetail }>;
      if (!json.success) {
        toast.error(json.error.message);
        return;
      }
      setSelected(json.data.report);
      window.requestAnimationFrame(() => {
        document.getElementById("report-preview-anchor")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch {
      toast.error("Failed to load report");
    }
  }, []);

  const generate = useCallback(
    async (options: GenerateReportOptions) => {
      setDialogOpen(false);
      setGenerating(true);
      setGenOpen(true);
      setGenError(null);
      setGenLabel(REPORT_TYPE_LABELS[options.reportType]);
      setGenStep("assemble");

      const assembleTimer = window.setTimeout(() => setGenStep("generate"), 400);
      const persistTimer = window.setTimeout(() => setGenStep("persist"), 1200);

      try {
        const response = await fetch(`/api/projects/${projectId}/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportType: options.reportType,
            title: options.title,
            forceRegenerate: options.forceRegenerate,
            formats: options.formats as ReportFormat[] | undefined,
          }),
        });
        const json = (await response.json()) as ApiEnvelope<{
          reportId: string;
          title: string;
          insufficientContext?: boolean;
        }>;

        window.clearTimeout(assembleTimer);
        window.clearTimeout(persistTimer);

        if (!response.ok || !json.success) {
          const message =
            !json.success && json.error ? json.error.message : "Report generation failed";
          setGenStep("error");
          setGenError(
            response.status === 503
              ? `${message} Run Executive on the Intelligence tab first, or configure Ollama.`
              : message,
          );
          toast.error(message);
          return;
        }

        setGenStep("done");
        toast.success(
          json.data.insufficientContext
            ? "Report created with incomplete intelligence context"
            : "Report generated",
        );
        await refreshReports();
        await viewReport(json.data.reportId);
        window.setTimeout(() => setGenOpen(false), 500);
      } catch {
        window.clearTimeout(assembleTimer);
        window.clearTimeout(persistTimer);
        setGenStep("error");
        setGenError("Network error while generating report.");
        toast.error("Network error while generating report");
      } finally {
        setGenerating(false);
      }
    },
    [projectId, refreshReports, viewReport],
  );

  function openGenerate(reportType: ReportType) {
    setDialogType(reportType);
    setDialogOpen(true);
  }

  function openAudiencePreset(preset: AudiencePreset) {
    void generate({
      reportType: preset.reportType,
      title: `${preset.titleSuffix} — ${projectName}`,
      formats: preset.formats,
    });
  }

  function openCompare(leftId?: string) {
    setCompareLeftId(leftId ?? selected?.id ?? null);
    setCompareOpen(true);
  }

  useEffect(() => {
    const generateType = searchParams.get("generate")?.toUpperCase();
    if (!generateType || autoGenerateHandled.done) return;
    const valid = Object.keys(REPORT_TYPE_LABELS).includes(generateType);
    if (!valid) return;
    autoGenerateHandled.done = true;
    startTransition(() => {
      openGenerate(generateType as ReportType);
      router.replace(`/dashboard/projects/${projectId}/reports`, { scroll: false });
    });
  }, [autoGenerateHandled, projectId, router, searchParams]);

  async function confirmDelete() {
    if (!deleteId) return;
    setDeletingId(deleteId);
    try {
      const response = await fetch(`/api/reports/${deleteId}`, { method: "DELETE" });
      const json = (await response.json()) as ApiEnvelope<{ deleted: boolean }>;
      if (!json.success) {
        toast.error(json.error.message);
        return;
      }
      toast.success("Report deleted");
      if (selected?.id === deleteId) setSelected(null);
      setReports((prev) => prev.filter((r) => r.id !== deleteId));
    } catch {
      toast.error("Failed to delete report");
    } finally {
      setDeletingId(null);
      setDeleteId(null);
    }
  }

  async function confirmRename() {
    if (!renameId || !renameTitle.trim()) return;
    try {
      const response = await fetch(`/api/reports/${renameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle.trim() }),
      });
      const json = (await response.json()) as ApiEnvelope<{ report: ReportSummary }>;
      if (!json.success) {
        toast.error(json.error.message);
        return;
      }
      toast.success("Report renamed");
      setReports((prev) =>
        prev.map((report) => (report.id === renameId ? { ...report, ...json.data.report } : report)),
      );
      if (selected?.id === renameId) {
        setSelected((prev) => (prev ? { ...prev, title: json.data.report.title } : prev));
      }
      setRenameId(null);
    } catch {
      toast.error("Failed to rename report");
    }
  }

  async function duplicateReport(reportId: string) {
    try {
      const response = await fetch(`/api/reports/${reportId}?action=duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await response.json()) as ApiEnvelope<{ report: ReportSummary }>;
      if (!json.success) {
        toast.error(json.error.message);
        return;
      }
      toast.success("Report duplicated");
      setReports((prev) => [json.data.report, ...prev]);
    } catch {
      toast.error("Failed to duplicate report");
    }
  }

  const showIntelBanner = !hasIntelligence;
  const showFindingsHint = hasIntelligence && !hasFindings;

  return (
    <div className="space-y-8">
      <ProjectTabHeader
        className="print:hidden"
        icon={FileText}
        title="Reports"
        description={
          <>
            Assemble board-ready packages for{" "}
            <span className="font-medium text-foreground">{projectName}</span> from the latest
            agent, consensus, and findings output. Exports stay local — no Ollama required for PDF,
            Markdown, Excel, or PowerPoint.
          </>
        }
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refreshReports()}
          disabled={loading}
          aria-label="Refresh reports"
          className="bg-background/50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={reports.length < 2}
          onClick={() => openCompare()}
          className="bg-background/50"
        >
          <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
          Compare
        </Button>
        <ReportGenerateMenu onGenerate={openGenerate} generating={generating} />
      </ProjectTabHeader>

      {showIntelBanner ? (
        <Card className="border-amber-500/30 bg-amber-500/[0.06] print:hidden">
          <CardContent className="flex flex-wrap items-start gap-4 p-5">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold">Run intelligence first for richer reports</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Specialist agents, consensus, and the executive package feed narrative reports.
                  Risk registers still work once findings exist.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/dashboard/projects/${projectId}/intelligence`}>
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  Open Intelligence
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showFindingsHint ? (
        <Card className="border-border/60 bg-muted/10 print:hidden">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <p className="text-muted-foreground">
              No open findings yet — risk registers and Excel exports will be empty until agents
              produce findings.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/projects/${projectId}/intelligence`}>Run a specialist scan</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby="audience-presets-heading" className="space-y-3 print:hidden">
        <div>
          <h2 id="audience-presets-heading" className="font-display text-lg font-semibold tracking-tight">
            Audience presets
          </h2>
          <p className="text-sm text-muted-foreground">
            One-click packs with eager formats matched to who will read them.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {AUDIENCE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={generating}
              onClick={() => openAudiencePreset(preset)}
              className={cn(
                "rounded-2xl border border-border/60 bg-card/40 p-4 text-left transition-all",
                "hover:border-primary/35 hover:bg-card/80",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-60",
              )}
            >
              <span className="block text-sm font-semibold text-foreground">{preset.label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {preset.description}
              </span>
              <span className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-primary">
                {preset.formats.filter((f) => f !== "MARKDOWN").join(" · ") || "Markdown"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="report-types-heading" className="space-y-3 print:hidden">
        <div>
          <h2 id="report-types-heading" className="font-display text-lg font-semibold tracking-tight">
            Quick generate
          </h2>
          <p className="text-sm text-muted-foreground">
            Pick a template, set a title, and optionally pre-build export formats.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {REPORT_TYPES.map((type) => {
            const Icon = REPORT_TYPE_ICONS[type];
            const emptyHint = EMPTY_CTA[type];
            const showEmpty =
              emptyHint &&
              ((type === "RISK_REGISTER" && !hasFindings) ||
                (type !== "RISK_REGISTER" && !hasIntelligence));
            return (
              <div key={type} className="space-y-2">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => openGenerate(type)}
                  className={cn(
                    "group w-full rounded-2xl border border-border/60 bg-card/40 p-4 text-left transition-all",
                    "hover:border-primary/35 hover:bg-card/80 hover:shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:pointer-events-none disabled:opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-transform group-hover:scale-105",
                      reportTypeAccent(type),
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="block text-sm font-semibold text-foreground">
                    {REPORT_TYPE_LABELS[type]}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {REPORT_TYPE_DESCRIPTIONS[type]}
                  </span>
                </button>
                {showEmpty && emptyHint ? (
                  <p className="px-1 text-[11px] leading-4 text-muted-foreground">
                    {emptyHint.body}{" "}
                    <Link
                      href={`/dashboard/projects/${projectId}/${emptyHint.href}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {emptyHint.linkLabel}
                    </Link>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div id="report-preview-anchor" className="scroll-mt-24">
        {selected ? (
          <ReportPreview
            report={selected}
            projectId={projectId}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </div>

      {reports.length === 0 && !loading ? (
        <Card className="border-dashed border-border/70 bg-transparent shadow-none print:hidden">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <FileText className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="max-w-md space-y-2">
              <p className="font-display text-lg font-semibold tracking-tight">No reports yet</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Generate an executive summary, board pack, risk register, or slide deck from your
                latest diligence runs.
              </p>
            </div>
            <ReportGenerateMenu onGenerate={openGenerate} generating={generating} />
          </CardContent>
        </Card>
      ) : reports.length > 0 ? (
        <ReportHistoryTable
          reports={reports}
          onView={(id) => void viewReport(id)}
          onDelete={setDeleteId}
          onRename={(id, title) => {
            setRenameId(id);
            setRenameTitle(title);
          }}
          onDuplicate={(id) => void duplicateReport(id)}
          onCompare={(id) => openCompare(id)}
          deletingId={deletingId}
          selectedId={selected?.id ?? null}
        />
      ) : null}

      <ReportGenerateDialog
        open={dialogOpen}
        reportType={dialogType}
        projectName={projectName}
        generating={generating}
        onOpenChange={setDialogOpen}
        onConfirm={(options) => void generate(options)}
      />

      <ReportCompareDialog
        projectId={projectId}
        reports={reports}
        open={compareOpen}
        onOpenChange={setCompareOpen}
        initialLeftId={compareLeftId}
      />

      <ReportGenerationModal
        open={genOpen}
        step={genStep}
        reportLabel={genLabel}
        errorMessage={genError}
        onOpenChange={setGenOpen}
      />

      <Dialog
        open={Boolean(renameId)}
        onOpenChange={(open) => {
          if (!open) setRenameId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename report</DialogTitle>
            <DialogDescription>Update the display title. Export filenames use the new title next time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="rename-report-title">Title</Label>
            <Input
              id="rename-report-title"
              value={renameTitle}
              onChange={(event) => setRenameTitle(event.target.value)}
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmRename()} disabled={!renameTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete report?"
        description="This permanently removes the report and any cached export files. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
