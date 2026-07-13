"use client";

import { Archive, Bell, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const POLL_INTERVAL_MS = 120_000;
const DEFER_FETCH_MS = 2_000;

export function NotificationsBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchNotifications = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const response = await fetch("/api/notifications");
      const json = await response.json();
      if (!json.success) {
        setError(true);
        return;
      }
      setNotifications(json.data.items);
      setUnreadCount(json.data.unreadCount);
      setError(false);
      hasFetchedRef.current = true;
    } catch {
      setError(true);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const deferredId = window.setTimeout(() => {
      if (!cancelled && !hasFetchedRef.current) {
        void fetchNotifications();
      }
    }, DEFER_FETCH_MS);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchNotifications({ silent: true });
      }
    }, POLL_INTERVAL_MS);

    function onNotificationsChanged() {
      void fetchNotifications({ silent: true });
    }

    window.addEventListener("nexusiq:notifications-changed", onNotificationsChanged);

    return () => {
      cancelled = true;
      window.clearTimeout(deferredId);
      window.clearInterval(interval);
      window.removeEventListener("nexusiq:notifications-changed", onNotificationsChanged);
    };
  }, [fetchNotifications]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      void fetchNotifications();
    }
  }

  async function markRead(notification: NotificationItem) {
    if (notification.readAt) {
      if (notification.link) {
        router.push(notification.link);
      }
      return;
    }

    await fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" });
    setNotifications((items) =>
      items.map((item) =>
        item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    if (notification.link) {
      router.push(notification.link);
    }
  }

  async function archiveNotification(notification: NotificationItem) {
    setPendingId(notification.id);
    try {
      const response = await fetch(`/api/notifications/${notification.id}/archive`, {
        method: "PATCH",
      });
      if (!response.ok) {
        toast.error("Could not archive notification.");
        return;
      }
      setNotifications((items) => items.filter((item) => item.id !== notification.id));
      if (!notification.readAt) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      toast.success("Notification archived.");
      window.dispatchEvent(new Event("nexusiq:notifications-changed"));
    } finally {
      setPendingId(null);
    }
  }

  async function deleteNotification(notification: NotificationItem) {
    setPendingId(notification.id);
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        toast.error("Could not delete notification.");
        return;
      }
      setNotifications((items) => items.filter((item) => item.id !== notification.id));
      if (!notification.readAt) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      toast.success("Notification deleted.");
      window.dispatchEvent(new Event("nexusiq:notifications-changed"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
          }
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <Link
            href="/dashboard/notifications"
            className="text-xs font-normal text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            View all
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && notifications.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && !loading && notifications.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-destructive" role="alert">
            Could not load notifications.
          </p>
        )}
        {!loading && !error && notifications.length === 0 && hasFetchedRef.current && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        )}
        {notifications.slice(0, 8).map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className="flex cursor-pointer flex-col items-start gap-2 py-3"
            onSelect={(event) => {
              // Keep the menu open when archive/delete buttons are used.
              const target = event.target as HTMLElement | null;
              if (target?.closest("[data-notification-action]")) {
                event.preventDefault();
                return;
              }
              void markRead(notification);
            }}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <span className="text-sm font-medium">{notification.title}</span>
              {notification.readAt && (
                <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <span className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</span>
            <div className="flex w-full justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-notification-action="archive"
                className="h-7 w-7 text-muted-foreground"
                disabled={pendingId === notification.id}
                aria-label={`Archive ${notification.title}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void archiveNotification(notification);
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-notification-action="delete"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                disabled={pendingId === notification.id}
                aria-label={`Delete ${notification.title}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void deleteNotification(notification);
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
