import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NotificationsInbox } from "@/features/organizations/components/notifications-inbox";
import { listUserNotifications } from "@/features/organizations/lib/notifications";
import { serializeNotifications } from "@/features/organizations/lib/serialize-notifications";
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

  const [inbox, archived] = await Promise.all([
    listUserNotifications(session.user.id, { limit: 50, archived: false }),
    listUserNotifications(session.user.id, { limit: 50, archived: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated on invites, processing, and team activity. Archive or delete items you no longer need."
      />

      <NotificationsInbox
        initialInbox={serializeNotifications(inbox)}
        initialArchived={serializeNotifications(archived)}
      />
    </div>
  );
}
