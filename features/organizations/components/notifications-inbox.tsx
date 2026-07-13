"use client";

import { Archive, CheckCheck, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export type NotificationListItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | Date | null;
  archivedAt: string | Date | null;
  createdAt: string | Date;
};

type NotificationsInboxProps = {
  initialInbox: NotificationListItem[];
  initialArchived: NotificationListItem[];
};

type Tab = "inbox" | "archived";

function toIso(value: string | Date | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

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
  const [deleteTarget, setDeleteTarget] = useState<NotificationListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const items = tab === "inbox" ? inbox : archived;

  const unreadCount = useMemo(
    () => inbox.filter((item) => !item.readAt).length,
    [inbox],
  );

  function emitChanged() {
    window.dispatchEvent(new Event("nexusiq:notifications-changed"));
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
      emitChanged();
      toast.success("Notification deleted.");
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

        {tab === "inbox" && unreadCount > 0 && (
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
            return (
              <li
                key={notification.id}
                className="rounded-xl border border-border/60 bg-card/30 p-4"
              >
                <div className="flex items-start justify-between gap-4">
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
            ? `“${deleteTarget.title}” will be permanently removed.`
            : "This notification will be permanently removed."
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={isPending && pendingId === deleteTarget?.id}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

/** Normalize Prisma Date objects for the client component. */
export function serializeNotifications(
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    link: string | null;
    readAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
  }>,
): NotificationListItem[] {
  return notifications.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    link: item.link,
    readAt: toIso(item.readAt),
    archivedAt: toIso(item.archivedAt),
    createdAt: toIso(item.createdAt)!,
  }));
}
