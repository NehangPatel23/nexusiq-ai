"use client";

import { forwardRef, useId } from "react";
import { Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { SearchMode } from "../lib/types";

interface SearchInputProps {
  query: string;
  mode: SearchMode;
  onQueryChange: (value: string) => void;
  onModeChange: (mode: SearchMode) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const MODES: Array<{ value: SearchMode; label: string; description: string; icon?: boolean }> = [
  { value: "hybrid", label: "Hybrid", description: "Keyword + semantic (recommended)", icon: true },
  { value: "semantic", label: "Semantic", description: "Meaning-based vector search" },
  { value: "keyword", label: "Keyword", description: "Full-text only, no Ollama required" },
];

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { query, mode, onQueryChange, onModeChange, onSubmit, disabled = false },
  ref,
) {
  const inputId = useId();
  const modeGroupId = useId();

  return (
    <div className="space-y-5">
      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Search documents
        </label>
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-soft",
            "ring-1 ring-primary/5 transition-shadow focus-within:border-primary/30 focus-within:ring-primary/20",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"
            aria-hidden="true"
          />
          <Search
            className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-primary/70"
            aria-hidden="true"
          />
          <Input
            ref={ref}
            id={inputId}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search contracts, financials, risks, entities…"
            className="relative h-16 border-0 bg-transparent pl-14 pr-32 text-base shadow-none focus-visible:ring-0"
            disabled={disabled}
            autoComplete="off"
          />
          <Button
            type="submit"
            size="lg"
            className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 px-6 shadow-md"
            disabled={disabled || !query.trim()}
          >
            Search
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-labelledby={modeGroupId}
          className="inline-flex rounded-xl border border-border/50 bg-card/30 p-1"
        >
          <span id={modeGroupId} className="sr-only">
            Search mode
          </span>
          {MODES.map((item) => {
            const selected = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={selected}
                title={item.description}
                disabled={disabled}
                onClick={() => onModeChange(item.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {item.icon && <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
            /
          </kbd>{" "}
          to focus ·{" "}
          <kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          to search
        </p>
      </div>
    </div>
  );
});
