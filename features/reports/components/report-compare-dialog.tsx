"use client";

import { GitCompareArrows } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

import type { ReportCompareResult } from "../lib/compare-reports";
import { REPORT_TYPE_LABELS } from "../lib/labels";
import type { ReportSummary } from "../lib/reports";

type ReportCompareDialogProps = {
  projectId: string;
  reports: ReportSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLeftId?: string | null;
};

export function ReportCompareDialog({
  projectId,
  reports,
  open,
  onOpenChange,
  initialLeftId,
}: ReportCompareDialogProps) {
  const sorted = useMemo(
    () => [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reports],
  );
  const [leftId, setLeftId] = useState(initialLeftId ?? sorted[0]?.id ?? "");
  const [rightId, setRightId] = useState(sorted[1]?.id ?? sorted[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportCompareResult | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialLeftId) setLeftId(initialLeftId);
    setResult(null);
  }, [open, initialLeftId]);

  async function runCompare() {
    if (!leftId || !rightId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/reports/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leftReportId: leftId, rightReportId: rightId }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { compare: ReportCompareResult };
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error?.message ?? "Compare failed");
        return;
      }
      setResult(json.data.compare);
    } catch {
      toast.error("Compare failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
            Compare reports
          </DialogTitle>
          <DialogDescription>
            Side-by-side preview of two versions. Same-type pairs are easiest to read after a
            regenerate.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Left
            </p>
            <Select value={leftId} onValueChange={setLeftId}>
              <SelectTrigger aria-label="Left report">
                <SelectValue placeholder="Select report" />
              </SelectTrigger>
              <SelectContent>
                {sorted.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {report.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Right
            </p>
            <Select value={rightId} onValueChange={setRightId}>
              <SelectTrigger aria-label="Right report">
                <SelectValue placeholder="Select report" />
              </SelectTrigger>
              <SelectContent>
                {sorted.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {report.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="sm:justify-start">
          <Button onClick={() => void runCompare()} disabled={loading || !leftId || !rightId}>
            {loading ? "Comparing…" : "Compare"}
          </Button>
        </DialogFooter>

        {result ? (
          <div className="space-y-4 border-t border-border/50 pt-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={result.sameType ? "secondary" : "warning"}>
                {result.sameType ? "Same type" : "Different types"}
              </Badge>
              <Badge variant={result.contentChanged ? "destructive" : "outline"}>
                {result.contentChanged ? "Content differs" : "Identical content"}
              </Badge>
              <Badge variant="outline">
                Sections shared: {result.sectionDiff.shared.length}
              </Badge>
            </div>

            {(result.sectionDiff.onlyLeft.length > 0 ||
              result.sectionDiff.onlyRight.length > 0) && (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Only in left
                  </p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {result.sectionDiff.onlyLeft.length === 0 ? (
                      <li>None</li>
                    ) : (
                      result.sectionDiff.onlyLeft.map((title) => <li key={title}>{title}</li>)
                    )}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Only in right
                  </p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {result.sectionDiff.onlyRight.length === 0 ? (
                      <li>None</li>
                    ) : (
                      result.sectionDiff.onlyRight.map((title) => <li key={title}>{title}</li>)
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-xl border border-border/60 bg-muted/10 p-3">
                <header className="mb-2 space-y-1 border-b border-border/40 pb-2">
                  <p className="text-sm font-semibold">{result.left.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {REPORT_TYPE_LABELS[result.left.reportType as keyof typeof REPORT_TYPE_LABELS] ??
                      result.left.reportType}{" "}
                    · {new Date(result.left.createdAt).toLocaleString()}
                  </p>
                </header>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-sans text-xs leading-5 text-foreground/85">
                  {result.leftPreview}
                </pre>
              </article>
              <article className="rounded-xl border border-border/60 bg-muted/10 p-3">
                <header className="mb-2 space-y-1 border-b border-border/40 pb-2">
                  <p className="text-sm font-semibold">{result.right.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {REPORT_TYPE_LABELS[
                      result.right.reportType as keyof typeof REPORT_TYPE_LABELS
                    ] ?? result.right.reportType}{" "}
                    · {new Date(result.right.createdAt).toLocaleString()}
                  </p>
                </header>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-sans text-xs leading-5 text-foreground/85">
                  {result.rightPreview}
                </pre>
              </article>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
