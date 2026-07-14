"use client";

import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function headingText(children: ReactNode): string {
  return String(children);
}

export function extractReportSections(markdown: string): Array<{ id: string; title: string }> {
  const headings: Array<{ id: string; title: string }> = [];
  for (const match of markdown.matchAll(/^##\s+(.+)$/gm)) {
    const title = match[1]?.trim();
    if (!title) continue;
    headings.push({ id: slugify(title), title });
  }
  return headings;
}

const reportMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="mb-4 font-display text-xl font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }) => {
    const title = headingText(children);
    const id = slugify(title);
    return (
      <h3
        id={`report-${id}`}
        className="mb-3 mt-8 scroll-mt-28 border-b border-border/50 pb-2 font-display text-base font-semibold tracking-tight text-foreground first:mt-0"
      >
        {children}
      </h3>
    );
  },
  h3: ({ children }) => (
    <h4 className="mb-2 mt-5 text-sm font-semibold text-foreground/95">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="mb-2 mt-4 text-sm font-medium text-foreground/90">{children}</h5>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-7 text-foreground/85 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-2 pl-5 text-sm leading-7 text-foreground/85 marker:text-primary/70">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-foreground/85 marker:text-primary/70">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-0.5 leading-7">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="text-foreground/90">{children}</em>,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-border/60 bg-muted/10 shadow-sm">
      <table className="w-full min-w-[20rem] border-collapse text-left text-xs sm:text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-border/40">{children}</tbody>,
  tr: ({ children }) => <tr className="transition-colors even:bg-muted/10 hover:bg-muted/20">{children}</tr>,
  th: ({ children }) => (
    <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2.5 align-top text-foreground/90">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-lg border-l-2 border-primary/50 bg-primary/5 py-2 pl-4 pr-3 text-sm leading-7 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-6">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="my-4 overflow-x-auto">{children}</pre>,
  hr: () => <hr className="my-6 border-border/50" />,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-primary underline-offset-2 hover:underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
};

type ReportMarkdownProps = {
  content: string;
  className?: string;
};

export function ReportMarkdown({ content, className }: ReportMarkdownProps) {
  return (
    <div className={cn("report-markdown max-w-none", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={reportMarkdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
