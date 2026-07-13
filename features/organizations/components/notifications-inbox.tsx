"use client";

import { Archive, CheckCheck, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { NotificationListItem } from "@/features/organizations/lib/serialize-notifications";
import { cn } from "@/lib/utils";

type NotificationsInboxProps = {
  initialInbox: NotificationListItem[];
  initialArchived: NotificationListItem[];
};

type Tab = "inbox" | "archived";
type BulkAction = "read" | "archive" | "unarchive" | "delete";

function formatWhen(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsInbox({
  initialInbox,
  initialArchived,
}: NotificationsInboxProps) {
  const [tab, setTab] = useState<Tab>("inbox");
  const [inbox, setInbox] = useState(initialInbox);
  const [archived, setArchived] = useState(initialArchived);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<NotificationListItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const items = tab === "inbox" ? inbox : archived;

  const unreadCount = useMemo(
    () => inbox.filter((item) => !item.readAt).length,
    [inbox],
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );

  const allVisibleSelected = items.length > 0 && selectedItems.length === items.length;
  const someVisibleSelected = selectedItems.length > 0 && !allVisibleSelected;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab]);

  function emitChanged() {
    window.dispatchEvent(new Event("nexusiq:notifications-changed"));
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(items.map((item) => item.id)));
  }

  async function runBulk(action: BulkAction, ids: string[]) {
    const response = await fetch("/api/notifications/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
    if (!response.ok) {
      throw new Error("bulk_failed");
    }
    return response.json() as Promise<{ success: boolean; data: { count: number } }>;
  }

  async function markRead(notification: NotificationListItem) {
    if (notification.readAt) return;
    const response = await fetch(`/api/notifications/${notification.id}/read`, {
      method: "PATCH",
    });
    if (!response.ok) {
      toast.error("Could not mark notification as read.");
      return;
    }
    setInbox((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    emitChanged();
  }

  function markAllRead() {
    startTransition(async () => {
      const response = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!response.ok) {
        toast.error("Could not mark all notifications as read.");
        return;
      }
      setInbox((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      emitChanged();
      toast.success("All notifications marked as read.");
    });
  }

  function archiveOne(notification: NotificationListItem) {
    setPendingId(notification.id);
    startTransition(async () => {
      const response = await fetch(`/api/notifications/${notification.id}/archive`, {
        method: "PATCH",
      });
      setPendingId(null);
      if (!response.ok) {
        toast.error("Could not archive notification.");
        return;
      }
      const archivedAt = new Date().toISOString();
      setInbox((current) => current.filter((item) => item.id !== notification.id));
      setArchived((current) => [
        {
          ...notification,
          readAt: notification.readAt ?? archivedAt,
          archivedAt,
        },
        ...current,
      ]);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
      emitChanged();
      toast.success("Notification archived.");
    });
  }

  function unarchiveOne(notification: NotificationListItem) {
    setPendingId(notification.id);
    startTransition(async () => {
      const response = await fetch(`/api/notifications/${notification.id}/unarchive`, {
        method: "POST",
      });
      setPendingId(null);
      if (!response.ok) {
        toast.error("Could not restore notification.");
        return;
      }
      setArchived((current) => current.filter((item) => item.id !== notification.id));
      setInbox((current) => [{ ...notification, archivedAt: null }, ...current]);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
      emitChanged();
      toast.success("Notification restored to inbox.");
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setPendingId(target.id);
    startTransition(async () => {
      const response = await fetch(`/api/notifications/${target.id}`, {
        method: "DELETE",
      });
      setPendingId(null);
      setDeleteTarget(null);
      if (!response.ok) {
        toast.error("Could not delete notification.");
        return;
      }
      setInbox((current) => current.filter((item) => item.id !== target.id));
      setArchived((current) => current.filter((item) => item.id !== target.id));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(target.id);
        return next;
      });
      emitChanged();
      toast.success("Notification deleted.");
    });
  }

  function applyBulk(action: BulkAction) {
    const ids = selectedItems.map((item) => item.id);
    if (ids.length === 0) return;

    startTransition(async () => {
      try {
        await runBulk(action, ids);
      } catch {
        toast.error("Could not update selected notifications.");
        return;
      }

      const selected = new Set(ids);
      const now = new Date().toISOString();

      if (action === "delete") {
        setInbox((current) => current.filter((item) => !selected.has(item.id)));
        setArchived((current) => current.filter((item) => !selected.has(item.id)));
        toast.success(`Deleted ${ids.length} notification${ids.length === 1 ? "" : "s"}.`);
      } else if (action === "archive") {
        const moving = inbox.filter((item) => selected.has(item.id));
        setInbox((current) => current.filter((item) => !selected.has(item.id)));
        setArchived((current) => [
          ...moving.map((item) => ({
            ...item,
            readAt: item.readAt ?? now,
            archivedAt: now,
          })),
          ...current,
        ]);
        toast.success(`Archived ${ids.length} notification${ids.length === 1 ? "" : "s"}.`);
      } else if (action === "unarchive") {
        const moving = archived.filter((item) => selected.has(item.id));
        setArchived((current) => current.filter((item) => !selected.has(item.id)));
        setInbox((current) => [
          ...moving.map((item) => ({ ...item, archivedAt: null })),
          ...current,
        ]);
        toast.success(`Restored ${ids.length} notification${ids.length === 1 ? "" : "s"}.`);
      } else if (action === "read") {
        setInbox((current) =>
          current.map((item) =>
            selected.has(item.id) ? { ...item, readAt: item.readAt ?? now } : item,
          ),
        );
        toast.success(`Marked ${ids.length} notification${ids.length === 1 ? "" : "s"} as read.`);
      }

      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      emitChanged();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-lg border border-border/60 bg-card/40 p-1"
          role="tablist"
          aria-label="Notification folders"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "inbox"}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "inbox"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("inbox")}
          >
            Inbox
            {unreadCount > 0 && (
              <Badge variant={tab === "inbox" ? "secondary" : "outline"} className="h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "archived"}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "archived"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("archived")}
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            Archived
            {archived.length > 0 && (
              <Badge variant={tab === "archived" ? "secondary" : "outline"} className="h-5 px-1.5">
                {archived.length}
              </Badge>
            )}
          </button>
        </div>

        {tab === "inbox" && unreadCount > 0 && selectedItems.length === 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={markAllRead}
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all read
          </Button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/20 px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
              onCheckedChange={(value) => toggleSelectAll(value === true)}
              aria-label="Select all notifications on this tab"
            />
            {selectedItems.length > 0
              ? `${selectedItems.length} selected`
              : "Select notifications"}
          </label>

          {selectedItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {tab === "inbox" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => applyBulk("read")}
                  >
                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                    Mark read
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => applyBulk("archive")}
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    Archive
                  </Button>
                </>
              )}
              {tab === "archived" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => applyBulk("unarchive")}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Restore
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-6 py-16 text-center text-sm text-muted-foreground">
          {tab === "inbox"
            ? "No notifications yet. You'll see invites and activity updates here."
            : "No archived notifications."}
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {items.map((notification) => {
            const busy = pendingId === notification.id && isPending;
            const selected = selectedIds.has(notification.id);
            return (
              <li
                key={notification.id}
                className={cn(
                  "rounded-xl border border-border/60 bg-card/30 p-4",
                  selected && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={selected}
                    onCheckedChange={(value) => toggleSelected(notification.id, value === true)}
                    aria-label={`Select ${notification.title}`}
                  />
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        {!notification.readAt && tab === "inbox" && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatWhen(notification.createdAt)}
                      </p>
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="mt-3 inline-block text-sm text-primary hover:underline"
                          onClick={() => {
                            if (tab === "inbox") void markRead(notification);
                          }}
                        >
                          View details
                        </Link>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {tab === "inbox" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          disabled={busy}
                          aria-label={`Archive ${notification.title}`}
                          onClick={() => archiveOne(notification)}
                        >
                          <Archive className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          disabled={busy}
                          aria-label={`Restore ${notification.title}`}
                          onClick={() => unarchiveOne(notification)}
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={busy}
                        aria-label={`Delete ${notification.title}`}
                        onClick={() => setDeleteTarget(notification)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete notification?"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" will be permanently removed.`
            : "This notification will be permanently removed."
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={isPending && pendingId === deleteTarget?.id}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete selected notifications?"
        description={`${selectedItems.length} notification${selectedItems.length === 1 ? "" : "s"} will be permanently removed.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={isPending}
        onConfirm={() => applyBulk("delete")}
      />
    </div>
  );
}
