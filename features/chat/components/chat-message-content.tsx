"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

import { normalizeAssistantMarkdown } from "../lib/normalize-markdown";

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 text-sm leading-6 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm leading-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm leading-6">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-6">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="text-foreground/90">{children}</em>,
  h1: ({ children }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h4>
  ),
  h3: ({ children }) => <h5 className="mb-2 mt-3 text-sm font-semibold">{children}</h5>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[16rem] border-collapse text-left text-xs sm:text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border/60 bg-muted/40">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-border/40">{children}</tbody>,
  tr: ({ children }) => <tr className="even:bg-muted/10">{children}</tr>,
  th: ({ children }) => (
    <th scope="col" className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-foreground/90">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-xs">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="my-3 overflow-x-auto">{children}</pre>,
  hr: () => <hr className="my-4 border-border/60" />,
  a: ({ href, children }) => {
    const isCitation = href?.includes("/data-room?") && String(children).match(/^\d+$/);
    if (isCitation) {
      return (
        <a
          href={href}
          className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-1.5 text-[10px] font-semibold text-primary no-underline hover:bg-primary/20"
          aria-label={`Source ${children}`}
        >
          {children}
        </a>
      );
    }
    return (
      <a
        href={href}
        className="text-primary underline-offset-2 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },
};

type ChatMessageContentProps = {
  content: string;
  className?: string;
};

export function ChatMessageContent({ content, className }: ChatMessageContentProps) {
  return (
    <div className={cn("chat-markdown text-foreground/90", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalizeAssistantMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
