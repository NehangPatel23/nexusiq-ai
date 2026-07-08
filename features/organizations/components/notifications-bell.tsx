"use client";

import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

export function NotificationsBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNotifications = useCallback(async () => {
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
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const interval = window.setInterval(() => {
      void fetchNotifications();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

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

  return (
    <DropdownMenu>
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
          >
            View all
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && !loading && (
          <p className="px-3 py-6 text-center text-sm text-destructive" role="alert">
            Could not load notifications.
          </p>
        )}
        {!loading && !error && notifications.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        )}
        {!loading &&
          !error &&
          notifications.slice(0, 8).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex cursor-pointer flex-col items-start gap-1 py-3"
              onSelect={() => void markRead(notification)}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="text-sm font-medium">{notification.title}</span>
                {notification.readAt && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <span className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
