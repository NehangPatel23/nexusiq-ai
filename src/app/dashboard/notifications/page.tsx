import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { listUserNotifications } from "@/features/organizations/lib/notifications";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const notifications = await listUserNotifications(session.user.id, 50);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="Stay updated on invites, processing, and team activity."
      />

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-6 py-16 text-center text-sm text-muted-foreground">
          No notifications yet. You&apos;ll see invites and activity updates here.
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className="rounded-xl border border-border/60 bg-card/30 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {notification.createdAt.toLocaleString()}
                  </p>
                </div>
                {!notification.readAt && (
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                    New
                  </span>
                )}
              </div>
              {notification.link && (
                <Link
                  href={notification.link}
                  className="mt-3 inline-block text-sm text-primary hover:underline"
                >
                  View details
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
