"use client";

import { Bookmark, ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import {
  createSavedSearchAction,
  deleteSavedSearchAction,
} from "../actions";
import type { SavedSearchItem, SearchFilters, SearchMode } from "../lib/types";

interface SavedSearchesMenuProps {
  projectId: string;
  savedSearches: SavedSearchItem[];
  query: string;
  filters: SearchFilters;
  mode: SearchMode;
  onApply: (item: SavedSearchItem) => void;
  onSaved: (item: SavedSearchItem) => void;
  onDeleted: (id: string) => void;
  disabled?: boolean;
}

export function SavedSearchesMenu({
  projectId,
  savedSearches,
  query,
  filters,
  mode,
  onApply,
  onSaved,
  onDeleted,
  disabled = false,
}: SavedSearchesMenuProps) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!saveName.trim() || !query.trim()) return;
    setSaving(true);
    const result = await createSavedSearchAction(projectId, {
      name: saveName.trim(),
      query: query.trim(),
      filters,
      mode,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    if (result.data) {
      onSaved(result.data);
      toast.success("Search saved");
      setSaveOpen(false);
      setSaveName("");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteSavedSearchAction(deleteId);
    setDeleting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    onDeleted(deleteId);
    toast.success("Saved search deleted");
    setDeleteId(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="border-border/60 bg-card/40"
            >
              <Bookmark className="mr-2 h-4 w-4" aria-hidden="true" />
              Saved searches
              {savedSearches.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {savedSearches.length}
                </span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 opacity-60" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Your saved searches</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {savedSearches.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">No saved searches yet</div>
            ) : (
              savedSearches.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="flex items-start justify-between gap-2"
                  onSelect={() => onApply(item)}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.query}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label={`Delete saved search ${item.name}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDeleteId(item.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || !query.trim()}
          onClick={() => {
            setSaveName(query.slice(0, 60));
            setSaveOpen(true);
          }}
        >
          Save search
        </Button>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save search</DialogTitle>
          </DialogHeader>
          <label className="space-y-2 text-sm">
            <span>Name</span>
            <Input
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="e.g. Revenue covenant clauses"
              maxLength={120}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !saveName.trim()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete saved search?"
        description="This removes the saved query and filters. Your documents are not affected."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
