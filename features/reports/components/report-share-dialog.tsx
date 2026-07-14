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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ShareLink = {
  id: string;
  label: string | null;
  format: string | null;
  url: string;
  expiresAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string };
};

type ReportShareDialogProps = {
  reportId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatExpiry(iso: string | null) {
  if (!iso) return "Never expires";
  return `Expires ${new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function ReportShareDialog({ reportId, open, onOpenChange }: ReportShareDialogProps) {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [format, setFormat] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshShares = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/shares`);
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
  }, [reportId]);

  useEffect(() => {
    if (open) void refreshShares();
  }, [open, refreshShares]);

  async function handleCreate() {
    setCreating(true);
    try {
      const days = expiresInDays ? Number.parseInt(expiresInDays, 10) : undefined;
      const res = await fetch(`/api/reports/${reportId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || undefined,
          expiresInDays: days && days > 0 ? days : undefined,
          format: format === "all" ? null : format,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: ShareLink;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "Failed to create share link");
        return;
      }
      toast.success("Share link created");
      setLabel("");
      if (json.data?.url) {
        try {
          await navigator.clipboard.writeText(json.data.url);
          toast.success("Link copied");
        } catch {
          /* ignore */
        }
      }
      await refreshShares();
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(shareId: string) {
    const res = await fetch(`/api/reports/${reportId}/shares/${shareId}`, { method: "DELETE" });
    const json = (await res.json()) as { success: boolean; error?: { message: string } };
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to revoke");
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
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Share report
          </DialogTitle>
          <DialogDescription>
            Create a time-limited link. Recipients can view Markdown and download exports without
            signing in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="report-share-label">Label (optional)</Label>
              <Input
                id="report-share-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Board circulation"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-share-expires">Expires in days</Label>
              <Input
                id="report-share-expires"
                inputMode="numeric"
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label>Export lock</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger aria-label="Lock share to format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any format</SelectItem>
                  <SelectItem value="PDF">PDF only</SelectItem>
                  <SelectItem value="MARKDOWN">Markdown only</SelectItem>
                  <SelectItem value="XLSX">Excel only</SelectItem>
                  <SelectItem value="PPTX">PowerPoint only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => void handleCreate()} disabled={creating} className="w-full sm:w-auto">
            {creating ? "Creating…" : "Create link"}
          </Button>

          <div className="space-y-2 border-t border-border/50 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active links
            </p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : shares.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                No active share links yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/10 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {share.label || "Untitled link"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatExpiry(share.expiresAt)}
                        {share.format ? ` · ${share.format}` : " · any format"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopy(share.url, share.id)}
                      aria-label="Copy share link"
                    >
                      {copiedId === share.id ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRevoke(share.id)}
                      aria-label="Revoke share link"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
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
