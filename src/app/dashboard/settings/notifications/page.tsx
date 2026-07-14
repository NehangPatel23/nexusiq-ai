import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NotificationsForm } from "@/features/settings/components/notifications-form";
import { parseNotificationPrefs } from "@/features/settings/lib/notification-prefs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Notification Settings" };

export default async function NotificationSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });

  return <NotificationsForm initial={parseNotificationPrefs(user?.notificationPrefs)} />;
}
