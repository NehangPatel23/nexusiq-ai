export type NotificationListItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

/** Normalize Prisma Date objects for the client component (server-safe). */
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
    readAt: item.readAt ? item.readAt.toISOString() : null,
    archivedAt: item.archivedAt ? item.archivedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
  }));
}
