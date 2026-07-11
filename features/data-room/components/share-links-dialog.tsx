"use client";

import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createShareLinkAction, revokeShareLinkAction } from "../actions";

type ShareLink = {
  id: string;
  token: string;
  label: string | null;
  url: string;
  expiresAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string };
};

interface ShareLinksDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatExpiry(iso: string | null) {
  if (!iso) return "Never expires";
  return `Expires ${new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function ShareLinksDialog({ projectId, open, onOpenChange }: ShareLinksDialogProps) {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshShares = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/shares`);
      const json = (await res.json()) as {
        success: boolean;
        data?: { items: ShareLink[] };
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Failed to load share links");
      }
      setShares(json.data?.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load share links");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      void refreshShares();
    }
  }, [open, refreshShares]);

  async function handleCreate() {
    setCreating(true);
    try {
      const days = expiresInDays ? Number.parseInt(expiresInDays, 10) : undefined;
      const result = await createShareLinkAction(projectId, {
        label: label.trim() || undefined,
        expiresInDays: days && days > 0 ? days : undefined,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Share link created");
      setLabel("");
      await refreshShares();
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(shareId: string) {
    const result = await revokeShareLinkAction(projectId, shareId);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Share link revoked");
    await refreshShares();
  }

  async function handleCopy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Link copied");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share data room</DialogTitle>
          <DialogDescription>
            Create read-only links for external reviewers. They can browse and preview documents
            without signing in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-border/60 bg-card/30 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="share-label">Label (optional)</Label>
              <Input
                id="share-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Investor diligence"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="share-expiry">Expires in (days)</Label>
              <Input
                id="share-expiry"
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="Leave empty for no expiry"
              />
            </div>
            <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
              <Link2 className="size-4" />
              {creating ? "Creating…" : "Create link"}
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Active links</h3>
            {loading ? (
              <div className="space-y-2" aria-busy="true">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-md bg-muted/40" />
                ))}
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active share links yet.</p>
            ) : (
              <ul className="space-y-2">
                {shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {share.label ?? "Untitled link"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatExpiry(share.expiresAt)} · Created by{" "}
                        {share.createdBy.name ?? share.createdBy.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleCopy(share.url, share.id)}
                        aria-label="Copy link"
                      >
                        {copiedId === share.id ? (
                          <Check className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                        Copy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleRevoke(share.id)}
                        aria-label="Revoke link"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
