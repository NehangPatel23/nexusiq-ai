"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Link2, Printer, Quote, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dataRoomCitationHref } from "@/features/chat/lib/citation-links";
import type { ChatCitation } from "@/lib/ai/citations";
import { cn } from "@/lib/utils";

import { ReportActionPlan, parseActionPlanItemsFromMarkdown } from "./report-action-plan";
import { ReportDownloadMenu } from "./report-download-menu";
import { extractReportSections, ReportMarkdown } from "./report-markdown";
import {
  ReportRiskRegister,
  parseRiskRegisterRowsFromMarkdown,
} from "./report-risk-register";
import { ReportShareDialog } from "./report-share-dialog";
import { ReportSnapshotChips } from "./report-snapshot-chips";
import { REPORT_TYPE_ICONS, REPORT_TYPE_LABELS, reportTypeAccent } from "../lib/labels";
import type { ReportDetail } from "../lib/reports";

type ReportPreviewProps = {
  report: ReportDetail;
  projectId: string;
  onClose: () => void;
};

/**
 * Self-contained reader: middle column scrolls; sections + citations stay pinned.
 */
export function ReportPreview({ report, projectId, onClose }: ReportPreviewProps) {
  const citations: ChatCitation[] = report.metadata?.citations ?? [];
  const markdownSections = useMemo(() => extractReportSections(report.content), [report.content]);
  const isRiskRegister = report.reportType === "RISK_REGISTER";
  const isActionPlan = report.reportType === "ACTION_PLAN";

  const riskRows = useMemo(() => {
    if (!isRiskRegister) return [];
    return (
      report.metadata?.riskRegisterRows ?? parseRiskRegisterRowsFromMarkdown(report.content)
    );
  }, [isRiskRegister, report.content, report.metadata?.riskRegisterRows]);

  const actionItems = useMemo(() => {
    if (!isActionPlan) return [];
    return report.metadata?.actionPlanItems ?? parseActionPlanItemsFromMarkdown(report.content);
  }, [isActionPlan, report.content, report.metadata?.actionPlanItems]);

  const sections = useMemo(() => {
    if (isRiskRegister) {
      return [
        { id: "overview", title: "Overview" },
        { id: "findings", title: "Findings" },
        { id: "citations", title: "Citations" },
      ];
    }
    if (isActionPlan) {
      return [
        { id: "overview", title: "Overview" },
        { id: "actions", title: "Actions" },
        { id: "citations", title: "Citations" },
      ];
    }
    return markdownSections;
  }, [isActionPlan, isRiskRegister, markdownSections]);

  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const [shareOpen, setShareOpen] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);
  const TypeIcon = REPORT_TYPE_ICONS[report.reportType];

  useEffect(() => {
    articleRef.current?.scrollTo({ top: 0 });
    setActiveSection(sections[0]?.id ?? "");
  }, [report.id, sections]);

  useEffect(() => {
    const root = articleRef.current;
    if (!sections.length || !root || isRiskRegister || isActionPlan) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveSection(visible.target.id.replace(/^report-/, ""));
        }
      },
      { root, rootMargin: "-12% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    for (const section of sections) {
      const element = root.querySelector(`#report-${CSS.escape(section.id)}`);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sections, report.content, isRiskRegister, isActionPlan]);

  function scrollToSection(sectionId: string) {
    if (sectionId === "citations") {
      focusCitation(1);
      setActiveSection(sectionId);
      return;
    }
    const root = articleRef.current;
    const target =
      root?.querySelector(`#report-${CSS.escape(sectionId)}`) ??
      root?.querySelector(`#${CSS.escape(sectionId)}`);
    if (target instanceof HTMLElement && root) {
      const top = target.offsetTop - root.offsetTop - 12;
      root.scrollTo({ top, behavior: "smooth" });
      setActiveSection(sectionId);
    }
  }

  function focusCitation(index: number) {
    const target = document.getElementById(`report-citation-${index}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      target.classList.add("ring-2", "ring-primary/50");
      window.setTimeout(() => target.classList.remove("ring-2", "ring-primary/50"), 1600);
    }
    setActiveSection("citations");
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="report-print-root flex h-[min(78vh,calc(100dvh-var(--topbar-height)-5rem))] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-sm backdrop-blur-sm"
      role="region"
      aria-label="Report preview"
    >
      <div className="report-print-hide relative shrink-0 border-b border-border/50 bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border",
                  reportTypeAccent(report.reportType),
                )}
                aria-hidden="true"
              >
                <TypeIcon className="h-4 w-4" />
              </span>
              <Badge variant="outline" className="border-border/60 bg-background/40">
                {REPORT_TYPE_LABELS[report.reportType]}
              </Badge>
              {report.metadata?.insufficientContext ? (
                <Badge variant="destructive">Insufficient context</Badge>
              ) : null}
            </div>
            <h2 className="font-display text-lg font-semibold tracking-tight sm:text-xl">
              {report.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Generated {new Date(report.createdAt).toLocaleString()}
              {citations.length > 0 ? ` · ${citations.length} citations` : ""}
            </p>
            <ReportSnapshotChips
              projectId={projectId}
              snapshot={report.metadata?.snapshotAsOf}
              consensusRunId={report.metadata?.consensusRunId}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
              aria-label="Share report"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} aria-label="Print report">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </Button>
            <ReportDownloadMenu
              reportId={report.id}
              formats={report.formatsAvailable}
              includeZip
            />
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close report preview">
              <X className="h-4 w-4" aria-hidden="true" />
              Close
            </Button>
          </div>
        </div>
      </div>

      <div className="report-print-layout grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[12rem_minmax(0,1fr)_17rem]">
        {sections.length > 0 ? (
          <nav
            aria-label="Report sections"
            className="report-print-hide hidden min-h-0 overflow-y-auto border-r border-border/40 bg-muted/10 p-4 lg:block"
          >
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sections
            </p>
            <ul className="space-y-0.5">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                      activeSection === section.id
                        ? "bg-primary/10 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div
            className="report-print-hide hidden border-r border-border/40 bg-muted/10 lg:block"
            aria-hidden="true"
          />
        )}

        <article
          ref={articleRef}
          className="report-print-body min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 lg:p-8"
          tabIndex={0}
          aria-label="Report body"
        >
          <div className="report-print-only mb-6 hidden">
            <h1 className="font-display text-2xl font-semibold text-black">{report.title}</h1>
            <p className="mt-1 text-sm text-neutral-600">
              {REPORT_TYPE_LABELS[report.reportType]} ·{" "}
              {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
          {isRiskRegister ? (
            <div id="overview">
              <div id="findings">
                <ReportRiskRegister
                  rows={riskRows}
                  projectId={projectId}
                  citations={citations}
                  onCitationFocus={focusCitation}
                />
              </div>
            </div>
          ) : isActionPlan ? (
            <div id="overview">
              <div id="actions">
                <ReportActionPlan
                  items={actionItems}
                  projectId={projectId}
                  citations={citations}
                  onCitationFocus={focusCitation}
                />
              </div>
            </div>
          ) : report.content.trim() ? (
            <ReportMarkdown content={report.content} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">This report has no content yet.</p>
            </div>
          )}
        </article>

        <aside
          className="report-print-citations flex min-h-0 flex-col border-t border-border/40 bg-muted/10 lg:border-l lg:border-t-0"
          aria-label="Citations"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-4 py-3">
            <Quote className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Citations ({citations.length})
            </h3>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {citations.length === 0 ? (
              <p className="px-4 py-6 text-xs leading-5 text-muted-foreground">
                No source citations were stored with this report.
              </p>
            ) : (
              <ul className="space-y-2 px-3 py-3">
                {citations.slice(0, 40).map((citation, index) => (
                  <li key={`${citation.documentId}-${citation.chunkId}-${index}`}>
                    <Link
                      id={`report-citation-${index + 1}`}
                      href={dataRoomCitationHref(projectId, citation, index + 1)}
                      className="block scroll-mt-4 rounded-xl border border-border/50 bg-background/40 p-3 transition-colors hover:border-primary/35 hover:bg-primary/[0.04]"
                    >
                      <p className="flex items-start gap-2 text-xs font-medium text-foreground">
                        <span className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                          {index + 1}
                        </span>
                        <span className="min-w-0 break-words underline-offset-2 group-hover:underline">
                          {citation.documentName}
                        </span>
                      </p>
                      {citation.excerpt ? (
                        <p className="mt-2 line-clamp-3 pl-7 text-[11px] leading-5 text-muted-foreground">
                          &ldquo;{citation.excerpt}&rdquo;
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <ReportShareDialog reportId={report.id} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
