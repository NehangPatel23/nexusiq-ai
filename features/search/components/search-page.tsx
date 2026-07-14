"use client";

import { AlertTriangle, ArrowRight, FileCheck, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { collectDocumentTags } from "@/features/data-room/lib/table-utils";
import type { DataRoomDocument } from "@/features/data-room/lib/types";
import { ProjectTabHeader } from "@/features/projects/components/project-tab-header";
import { searchDocumentsAction } from "@/features/search/actions";
import type {
  SavedSearchItem,
  SearchFilters,
  SearchMeta,
  SearchMode,
  SearchResultItem,
} from "@/features/search/lib/types";
import { buildSearchUrlParams, parseSearchUrlState } from "@/features/search/lib/url-state";
import {
  clearRecentSearches,
  loadRecentSearches,
  saveRecentSearch,
  type RecentSearchEntry,
} from "@/features/search/lib/recent-searches";
import { cn } from "@/lib/utils";

import { RecentSearches } from "./recent-searches";

import { SearchFiltersBar } from "./search-filters";
import { SearchInput } from "./search-input";
import { SearchResults } from "./search-results";
import { SavedSearchesMenu } from "./saved-searches-menu";

interface FolderOption {
  id: string;
  path: string;
}

interface SearchPageProps {
  projectId: string;
  initialSavedSearches: SavedSearchItem[];
  folders: FolderOption[];
  documents: DataRoomDocument[];
  initialOllamaStatus: "connected" | "unreachable" | "not_configured" | "checking";
}

type SearchParams = {
  query: string;
  mode: SearchMode;
  filters: SearchFilters;
};

function OllamaStatusBadge({
  status,
}: {
  status: "connected" | "unreachable" | "not_configured" | "checking";
}) {
  if (status === "checking") {
    return (
      <Badge variant="outline" className="gap-1">
        <Zap className="h-3 w-3 animate-pulse" aria-hidden="true" />
        Checking Ollama…
      </Badge>
    );
  }
  if (status === "connected") {
    return (
      <Badge variant="success" className="gap-1">
        <Zap className="h-3 w-3" aria-hidden="true" />
        Ollama connected
      </Badge>
    );
  }
  if (status === "unreachable") {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Ollama unreachable
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      Ollama not configured
    </Badge>
  );
}

export function SearchPage({
  projectId,
  initialSavedSearches,
  folders,
  documents,
  initialOllamaStatus,
}: SearchPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlState = useMemo(() => parseSearchUrlState(searchParams), [searchParams]);

  const [query, setQuery] = useState(urlState.query);
  const [mode, setMode] = useState<SearchMode>(urlState.mode);
  const [filters, setFilters] = useState<SearchFilters>(urlState.filters);
  const [savedSearches, setSavedSearches] = useState(initialSavedSearches);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [fallbackBanner, setFallbackBanner] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState(initialOllamaStatus);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const availableTags = useMemo(() => collectDocumentTags(documents), [documents]);
  const readyDocCount = useMemo(
    () => documents.filter((doc) => doc.status === "READY").length,
    [documents],
  );

  const initialSearchDone = useRef(false);
  const skipUrlSync = useRef(true);

  useEffect(() => {
    if (initialOllamaStatus !== "checking") return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/health");
        const payload = (await response.json()) as { ollama?: string };
        if (cancelled) return;
        if (payload.ollama === "connected") setOllamaStatus("connected");
        else if (payload.ollama === "not_configured") setOllamaStatus("not_configured");
        else setOllamaStatus("unreachable");
      } catch {
        if (!cancelled) setOllamaStatus("unreachable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialOllamaStatus]);

  const syncUrl = useCallback(
    (state: SearchParams) => {
      const params = buildSearchUrlParams(state);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router],
  );

  const executeSearch = useCallback(
    async (params: SearchParams) => {
      const trimmed = params.query.trim();
      if (!trimmed) {
        setError("Enter a search query");
        return;
      }

      setQuery(params.query);
      setMode(params.mode);
      setFilters(params.filters);
      syncUrl(params);

      setLoading(true);
      setError(null);
      setFallbackBanner(null);
      setHasSearched(true);

      const result = await searchDocumentsAction(projectId, {
        query: trimmed,
        mode: params.mode,
        filters: params.filters,
        limit: 20,
      });

      setLoading(false);

      if (!result.success) {
        setResults([]);
        setMeta(null);
        setError(result.error.message);
        return;
      }

      if (!result.data) {
        setResults([]);
        setMeta(null);
        setError("Search failed");
        return;
      }

      setResults(result.data.results);
      setMeta(result.data.meta);
      setRecentSearches(
        saveRecentSearch(projectId, {
          query: trimmed,
          mode: params.mode,
          filters: params.filters,
        }),
      );

      if (result.data.meta.fallback && result.data.meta.fallbackMessage) {
        setFallbackBanner(result.data.meta.fallbackMessage);
        toast.warning(result.data.meta.fallbackMessage);
      }
    },
    [projectId, syncUrl],
  );

  const runSearch = useCallback(() => {
    void executeSearch({ query, mode, filters });
  }, [executeSearch, query, mode, filters]);

  useEffect(() => {
    if (urlState.query.trim() && !initialSearchDone.current) {
      initialSearchDone.current = true;
      void executeSearch(urlState);
    }
  }, [urlState, executeSearch]);

  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }
    syncUrl({ query, mode, filters });
  }, [query, mode, filters, syncUrl]);

  function applySavedSearch(item: SavedSearchItem) {
    void executeSearch({
      query: item.query,
      mode: item.mode,
      filters: item.filters ?? {},
    });
  }

  useEffect(() => {
    setRecentSearches(loadRecentSearches(projectId));
  }, [projectId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      if (isEditable) return;

      event.preventDefault();
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function applyRecentSearch(entry: RecentSearchEntry) {
    void executeSearch({
      query: entry.query,
      mode: entry.mode,
      filters: entry.filters ?? {},
    });
  }

  function handleClearRecentSearches() {
    clearRecentSearches(projectId);
    setRecentSearches([]);
  }

  const dataRoomHref = `/dashboard/projects/${projectId}/data-room`;

  function handleSuggestionClick(suggestion: string) {
    void executeSearch({ query: suggestion, mode, filters });
  }

  return (
    <div className="space-y-6">
      <ProjectTabHeader
        icon={Sparkles}
        title="Smart Search"
        description="Hybrid keyword and semantic search across processed documents. Find clauses, figures, and risks with highlighted snippets and relevance scores."
        meta={
          <>
            <Badge variant="secondary" className="gap-1">
              <FileCheck className="h-3 w-3" aria-hidden="true" />
              {readyDocCount} searchable doc{readyDocCount === 1 ? "" : "s"}
            </Badge>
            <OllamaStatusBadge status={ollamaStatus} />
            {savedSearches.length > 0 && (
              <Badge variant="outline">
                {savedSearches.length} saved search{savedSearches.length === 1 ? "" : "es"}
              </Badge>
            )}
          </>
        }
      >
        <SavedSearchesMenu
          projectId={projectId}
          savedSearches={savedSearches}
          query={query}
          filters={filters}
          mode={mode}
          disabled={loading}
          onApply={applySavedSearch}
          onSaved={(item) => setSavedSearches((prev) => [item, ...prev])}
          onDeleted={(id) => setSavedSearches((prev) => prev.filter((item) => item.id !== id))}
        />
      </ProjectTabHeader>

      {(ollamaStatus === "unreachable" || ollamaStatus === "not_configured") &&
        mode !== "keyword" && (
          <div
            role="status"
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              "border-warning/30 bg-warning/10 text-warning",
            )}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              {ollamaStatus === "not_configured"
                ? "Ollama is not configured — semantic and hybrid modes will fall back to keyword search."
                : "Ollama is unreachable — semantic and hybrid modes will fall back to keyword search."}
            </p>
          </div>
        )}

      {fallbackBanner && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{fallbackBanner}</p>
        </div>
      )}

      {readyDocCount === 0 && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-muted-foreground">
            No processed documents yet. Upload files in the Data Room and wait for processing to
            complete before searching.
          </p>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
            <Link href={dataRoomHref}>
              Open Data Room
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <SearchInput
          ref={searchInputRef}
          query={query}
          mode={mode}
          onQueryChange={setQuery}
          onModeChange={setMode}
          onSubmit={runSearch}
          disabled={loading}
        />

        <RecentSearches
          entries={recentSearches}
          onApply={applyRecentSearch}
          onClear={handleClearRecentSearches}
          disabled={loading}
        />

        <SearchFiltersBar
          filters={filters}
          folders={folders}
          availableTags={availableTags}
          onChange={setFilters}
          onClear={() => setFilters({})}
          disabled={loading}
        />
      </div>

      <SearchResults
        projectId={projectId}
        results={results}
        meta={meta}
        loading={loading}
        error={error}
        hasSearched={hasSearched}
        query={query}
        onSuggestionClick={handleSuggestionClick}
      />
    </div>
  );
}
