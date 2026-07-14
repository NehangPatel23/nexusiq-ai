"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ConfidenceLevel } from "@prisma/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { dataRoomCitationHref } from "@/features/chat/lib/citation-links";
import type { ChatCitation } from "@/lib/ai/citations";
import { AGENT_TYPE_LABELS, type SpecialistAgentType } from "@/lib/ai/agents/types";
import { cn } from "@/lib/utils";

export type ExecutiveSpecialistContext = {
  agentType: SpecialistAgentType | string;
  runId: string;
  score: number | null;
  confidence: ConfidenceLevel | string;
  recommendation: string;
};

type ExecutiveReportViewProps = {
  projectId: string;
  markdown: string;
  citations: ChatCitation[];
  specialistRunIds?: string[];
  specialistContext?: ExecutiveSpecialistContext[];
  className?: string;
};

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractSectionNav(markdown: string): Array<{ id: string; title: string }> {
  const headings: Array<{ id: string; title: string }> = [];
  for (const match of markdown.matchAll(/^##\s+(.+)$/gm)) {
    const title = match[1]?.trim();
    if (!title) continue;
    headings.push({ id: slugify(title), title });
  }
  return headings;
}

export function ExecutiveReportView({
  projectId,
  markdown,
  citations,
  specialistRunIds = [],
  specialistContext = [],
  className,
}: ExecutiveReportViewProps) {
  const sections = useMemo(() => extractSectionNav(markdown), [markdown]);
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const trimmedMarkdown = markdown.trim();

  useEffect(() => {
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveSection(visible.target.id.replace(/^exec-/, ""));
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.4, 0.7] },
    );

    for (const section of sections) {
      const element = document.getElementById(`exec-${section.id}`);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sections, trimmedMarkdown]);

  if (!trimmedMarkdown) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
        No executive report content was generated. Re-run the executive package after specialist scans
        complete.
      </p>
    );
  }

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[14rem_1fr]", className)}>
      {sections.length > 0 ? (
        <nav
          aria-label="Executive report sections"
          className="space-y-1 lg:sticky lg:top-24 lg:self-start"
        >
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Sections
          </p>
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#exec-${section.id}`}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "block rounded-md px-2 py-1.5 text-xs transition-colors",
                activeSection === section.id
                  ? "bg-primary/10 font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {section.title}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="space-y-4">
        <div className="flex justify-end">
          <Link
            href={`/dashboard/projects/${projectId}/reports?generate=EXECUTIVE`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Export as report →
          </Link>
        </div>
        {specialistContext.length > 0 ? (
          <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Specialist context included</p>
              <Badge variant="outline">{specialistContext.length} agents</Badge>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2" role="list">
              {specialistContext.map((item) => {
                const label =
                  AGENT_TYPE_LABELS[item.agentType as SpecialistAgentType] ?? String(item.agentType);
                return (
                  <li
                    key={item.runId}
                    className="rounded-md border border-border/50 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{label}</span>
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {item.score === null || item.score === undefined
                          ? "—"
                          : Math.round(item.score)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.recommendation}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : specialistRunIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Specialist runs included</span>
            <Badge variant="outline">{specialistRunIds.length}</Badge>
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground">
            No completed specialist runs were available as context for this package.
          </p>
        )}

        <article className="prose-invert max-w-none rounded-lg border border-border/60 bg-muted/10 p-5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => {
                const title = String(children);
                const id = slugify(title);
                return (
                  <h3
                    id={`exec-${id}`}
                    className="mb-3 mt-6 scroll-mt-28 text-base font-semibold first:mt-0"
                  >
                    {children}
                  </h3>
                );
              },
              p: ({ children }) => (
                <p className="mb-3 text-sm leading-6 text-foreground/90 last:mb-0">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm leading-6">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm leading-6">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-6">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
            }}
          >
            {trimmedMarkdown}
          </ReactMarkdown>
        </article>

        {citations.length > 0 ? (
          <div className="flex flex-wrap gap-2" aria-label="Executive citations">
            {citations.map((citation, index) => (
              <Link
                key={`${citation.documentId}-${citation.chunkId}-${index}`}
                href={dataRoomCitationHref(projectId, citation, index)}
                className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium hover:bg-muted/40"
              >
                {citation.documentName}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
