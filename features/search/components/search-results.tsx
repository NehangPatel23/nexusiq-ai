"use client";

import {
  ArrowRight,
  ChevronDown,
  ExternalLink,
  FileSearch,
  FileText,
  Loader2,
  MessageSquare,
  SearchX,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { SearchMeta, SearchResultItem } from "../lib/types";

interface SearchResultsProps {
  projectId: string;
  results: SearchResultItem[];
  meta: SearchMeta | null;
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
  query: string;
  onSuggestionClick?: (suggestion: string) => void;
}

const SUGGESTIONS = ["revenue", "contract terms", "compliance risk", "customer concentration"];

function formatScore(score: number) {
  return score < 1 ? score.toFixed(3) : score.toFixed(2);
}

const SNIPPET_COLLAPSE_CHARS = 320;

function SearchResultCard({
  result,
  index,
  projectId,
}: {
  result: SearchResultItem;
  index: number;
  projectId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const dataRoomHref = `/dashboard/projects/${projectId}/data-room?doc=${result.documentId}&chunk=${result.chunkId}&highlight=${encodeURIComponent(result.snippet.replace(/<[^>]+>/g, "").slice(0, 120))}`;
  const chatHref = `/dashboard/projects/${projectId}/chat?q=${encodeURIComponent(`Explain this excerpt from ${result.documentName}`)}&context=${encodeURIComponent(result.content.slice(0, 500))}`;
  const plainContent = result.content.trim();
  const canExpand = plainContent.length > SNIPPET_COLLAPSE_CHARS;

  return (
    <li>
      <article
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-border/50 bg-card/40",
          "transition-all hover:border-primary/30 hover:bg-card/60 hover:shadow-soft",
        )}
      >
        <div
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/80 to-accent/60 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
        <div className="p-5 pl-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/50 text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <Link
                  href={dataRoomHref}
                  className={cn(
                    "inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground",
                    "hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
                  <span className="truncate">{result.documentName}</span>
                  <ExternalLink
                    className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
                    aria-hidden="true"
                  />
                </Link>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-8">
                <Badge variant="secondary">{result.documentType}</Badge>
                {result.classification && (
                  <Badge variant="outline">{result.classification}</Badge>
                )}
                {result.pageNumber != null && (
                  <Badge variant="outline">p. {result.pageNumber}</Badge>
                )}
                {result.sectionTitle && (
                  <Badge variant="outline">{result.sectionTitle}</Badge>
                )}
              </div>
            </div>
            <Badge variant="accent" title="Relevance score" className="shrink-0 tabular-nums">
              {formatScore(result.score)}
            </Badge>
          </div>

          {expanded ? (
            <p className="mt-3 whitespace-pre-wrap pl-8 text-sm leading-relaxed text-muted-foreground">
              {plainContent}
            </p>
          ) : (
            <p
              className="mt-3 pl-8 text-sm leading-relaxed text-muted-foreground [&_mark]:rounded-sm [&_mark]:bg-primary/25 [&_mark]:px-1 [&_mark]:font-medium [&_mark]:text-foreground"
              dangerouslySetInnerHTML={{ __html: result.snippet }}
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 pl-8">
            {canExpand && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-muted-foreground"
                aria-expanded={expanded}
                onClick={() => setExpanded((prev) => !prev)}
              >
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
                  aria-hidden="true"
                />
                {expanded ? "Show less" : "Show more context"}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-primary" asChild>
              <Link href={chatHref}>
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Ask in chat
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-primary" asChild>
              <Link href={dataRoomHref}>
                Open in data room
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </article>
    </li>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-border/40 bg-card/30 p-5"
        >
          <div className="mb-3 h-4 w-1/3 rounded bg-muted/50" />
          <div className="mb-2 h-3 w-full rounded bg-muted/40" />
          <div className="h-3 w-4/5 rounded bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

export function SearchResults({
  projectId,
  results,
  meta,
  loading,
  error,
  hasSearched,
  query,
  onSuggestionClick,
}: SearchResultsProps) {
  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Searching project documents…
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5 p-6 text-sm text-destructive"
      >
        {error}
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/50 bg-gradient-to-br from-card/60 via-card/40 to-primary/5 px-6 py-16 text-center md:py-20">
        <div
          className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-inner-soft">
            <FileSearch className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Search your data room
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Find clauses, financial figures, entities, and risks across processed documents.
            Hybrid mode combines keyword precision with semantic understanding.
          </p>
          {onSuggestionClick && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">Try:</span>
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-border/60 bg-card/40 text-xs"
                  onClick={() => onSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/50 via-card/30 to-muted/10 px-6 py-14 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-muted/30">
          <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">No matches found</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          No processed documents matched{" "}
          <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>. Try different
          keywords, switch to keyword mode, or broaden your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-live="polite">
      {meta && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">
            {meta.uniqueDocuments} document{meta.uniqueDocuments === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline">{meta.mode} mode</Badge>
          <Badge variant="outline">{meta.tookMs}ms</Badge>
          {meta.ollamaUsed && <Badge variant="accent">Semantic ranking</Badge>}
        </div>
      )}

      <ul className="space-y-3" role="list">
        {results.map((result, index) => (
          <SearchResultCard
            key={result.chunkId}
            result={result}
            index={index}
            projectId={projectId}
          />
        ))}
      </ul>
    </div>
  );
}
