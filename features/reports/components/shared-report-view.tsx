"use client";

import { Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ReportMarkdown } from "./report-markdown";
import { REPORT_TYPE_LABELS } from "../lib/labels";

type SharedReportViewProps = {
  token: string;
  projectName: string;
  shareLabel: string | null;
  formatLock: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  report: {
    title: string;
    reportType: string;
    content: string;
    createdAt: string;
  };
};

export function SharedReportView({
  token,
  projectName,
  shareLabel,
  formatLock,
  expiresAt,
  createdBy,
  report,
}: SharedReportViewProps) {
  const formats = formatLock
    ? [formatLock === "MARKDOWN" ? "md" : formatLock.toLowerCase()]
    : ["pdf", "md", "xlsx", "pptx"];

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-3 border-b border-border/60 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          NexusIQ shared report
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {report.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {projectName}
          {shareLabel ? ` · ${shareLabel}` : ""}
          {createdBy ? ` · Shared by ${createdBy}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {REPORT_TYPE_LABELS[report.reportType as keyof typeof REPORT_TYPE_LABELS] ??
              report.reportType}
          </Badge>
          <Badge variant="secondary">
            Generated {new Date(report.createdAt).toLocaleString()}
          </Badge>
          {expiresAt ? (
            <Badge variant="outline">Expires {new Date(expiresAt).toLocaleDateString()}</Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {formats.map((format) => (
            <Button key={format} asChild variant="outline" size="sm">
              <a href={`/api/share/reports/${token}/export?format=${format}`}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Download {format.toUpperCase()}
              </a>
            </Button>
          ))}
        </div>
      </header>

      {report.content.trim() ? (
        <ReportMarkdown content={report.content} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">This shared report has no content.</p>
        </div>
      )}
    </div>
  );
}
