"use client";

import { Clock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RecentSearchEntry } from "@/features/search/lib/recent-searches";

interface RecentSearchesProps {
  entries: RecentSearchEntry[];
  onApply: (entry: RecentSearchEntry) => void;
  onClear: () => void;
  disabled?: boolean;
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentSearches({ entries, onApply, onClear, disabled = false }: RecentSearchesProps) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Recent searches">
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Recent
      </span>
      {entries.map((entry) => (
        <Button
          key={`${entry.query}-${entry.mode}-${entry.searchedAt}`}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 max-w-[220px] gap-1 rounded-full border-border/60 bg-card/40 px-2.5 text-xs"
          title={`${entry.query} (${entry.mode}) · ${formatRelativeTime(entry.searchedAt)}`}
          onClick={() => onApply(entry)}
        >
          <span className="truncate">{entry.query}</span>
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        onClick={onClear}
      >
        <X className="h-3 w-3" aria-hidden="true" />
        Clear
      </Button>
    </div>
  );
}
