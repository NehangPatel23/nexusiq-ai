"use client";

import type { ReportFormat, ReportType } from "@prisma/client";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
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

import {
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TYPE_ICONS,
  REPORT_TYPE_LABELS,
  isNarrativeReportType,
  reportTypeAccent,
} from "../lib/labels";

export type GenerateReportOptions = {
  reportType: ReportType;
  title?: string;
  forceRegenerate?: boolean;
  formats?: ReportFormat[];
};

type ReportGenerateDialogProps = {
  open: boolean;
  reportType: ReportType | null;
  projectName: string;
  generating?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: GenerateReportOptions) => void;
};

const FORMAT_OPTIONS: Array<{ value: ReportFormat; label: string; hint: string }> = [
  { value: "MARKDOWN", label: "Markdown", hint: "Always stored" },
  { value: "PDF", label: "PDF", hint: "Print-ready" },
  { value: "XLSX", label: "Excel", hint: "Findings sheet" },
  { value: "PPTX", label: "PowerPoint", hint: "Slide deck" },
];

export function ReportGenerateDialog({
  open,
  reportType,
  projectName,
  generating,
  onOpenChange,
  onConfirm,
}: ReportGenerateDialogProps) {
  const [title, setTitle] = useState("");
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [formats, setFormats] = useState<ReportFormat[]>(["MARKDOWN", "PDF"]);

  useEffect(() => {
    if (!reportType || !open) return;
    setTitle(`${REPORT_TYPE_LABELS[reportType]} — ${projectName}`);
    setForceRegenerate(false);
    const defaults: ReportFormat[] =
      reportType === "RISK_REGISTER"
        ? ["MARKDOWN", "XLSX", "PDF"]
        : reportType === "PPTX"
          ? ["MARKDOWN", "PPTX", "PDF"]
          : ["MARKDOWN", "PDF"];
    setFormats(defaults);
  }, [reportType, projectName, open]);

  if (!reportType) return null;

  const Icon = REPORT_TYPE_ICONS[reportType];
  const narrative = isNarrativeReportType(reportType);

  function toggleFormat(format: ReportFormat) {
    if (format === "MARKDOWN") return;
    setFormats((prev) =>
      prev.includes(format) ? prev.filter((item) => item !== format) : [...prev, format],
    );
  }

  function handleConfirm() {
    onConfirm({
      reportType,
      title: title.trim() || undefined,
      forceRegenerate: narrative ? forceRegenerate : false,
      formats: formats.includes("MARKDOWN") ? formats : ["MARKDOWN", ...formats],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby="generate-report-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl border",
                reportTypeAccent(reportType),
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            Generate {REPORT_TYPE_LABELS[reportType]}
          </DialogTitle>
          <DialogDescription id="generate-report-desc">
            {REPORT_TYPE_DESCRIPTIONS[reportType]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label htmlFor="report-title">Title</Label>
            <Input
              id="report-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              placeholder="Report title"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Eager export formats</legend>
            <p className="text-xs text-muted-foreground">
              Markdown is always saved. Extra formats are generated now and cached for download.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {FORMAT_OPTIONS.map((option) => {
                const checked = formats.includes(option.value);
                const disabled = option.value === "MARKDOWN";
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-xl border border-border/60 bg-muted/10 p-3",
                      disabled && "cursor-default opacity-80",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled || generating}
                      onCheckedChange={() => toggleFormat(option.value)}
                      aria-label={option.label}
                    />
                    <span>
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {narrative ? (
            <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/10 p-3">
              <Checkbox
                checked={forceRegenerate}
                disabled={generating}
                onCheckedChange={(value) => setForceRegenerate(value === true)}
                aria-label="Regenerate narrative with Ollama"
              />
              <span>
                <span className="block text-sm font-medium">Regenerate narrative with Ollama</span>
                <span className="text-xs leading-5 text-muted-foreground">
                  Skips reusing the Executive AgentRun draft and calls Ollama. Requires a reachable
                  OLLAMA_BASE_URL. Leave off for faster offline assembly.
                </span>
              </span>
            </label>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={generating || !title.trim()}>
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
