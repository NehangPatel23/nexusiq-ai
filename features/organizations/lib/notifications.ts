import type { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/db";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export type ListNotificationsOptions = {
  limit?: number;
  /** When true, only archived; when false/omitted, inbox (not archived). */
  archived?: boolean;
};

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: input,
  });
}

export async function listUserNotifications(
  userId: string,
  options: ListNotificationsOptions | number = {},
) {
  const normalized =
    typeof options === "number" ? { limit: options, archived: false } : options;
  const limit = normalized.limit ?? 20;
  const archived = normalized.archived === true;

  return prisma.notification.findMany({
    where: {
      userId,
      archivedAt: archived ? { not: null } : null,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null, archivedAt: null },
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return null;
  }

  if (notification.readAt) {
    return notification;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null, archivedAt: null },
    data: { readAt: new Date() },
  });
}

export async function archiveNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId, archivedAt: null },
  });

  if (!notification) {
    return null;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      archivedAt: new Date(),
      readAt: notification.readAt ?? new Date(),
    },
  });
}

export async function unarchiveNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId, archivedAt: { not: null } },
  });

  if (!notification) {
    return null;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { archivedAt: null },
  });
}

export async function deleteNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return null;
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return notification;
}

export async function deleteInviteNotifications(token: string) {
  return prisma.notification.deleteMany({
    where: { link: `/invite/${token}` },
  });
}

export type BulkNotificationAction = "read" | "archive" | "unarchive" | "delete";

export async function bulkUpdateNotifications(
  userId: string,
  ids: string[],
  action: BulkNotificationAction,
) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { count: 0 };
  }

  const owned = await prisma.notification.findMany({
    where: { userId, id: { in: uniqueIds } },
    select: { id: true, readAt: true, archivedAt: true },
  });
  if (owned.length === 0) {
    return { count: 0 };
  }

  if (action === "delete") {
    const result = await prisma.notification.deleteMany({
      where: { userId, id: { in: owned.map((item) => item.id) } },
    });
    return { count: result.count };
  }

  if (action === "read") {
    const unreadIds = owned
      .filter((item) => item.archivedAt === null && item.readAt === null)
      .map((item) => item.id);
    if (unreadIds.length === 0) return { count: 0 };
    const result = await prisma.notification.updateMany({
      where: { userId, id: { in: unreadIds } },
      data: { readAt: new Date() },
    });
    return { count: result.count };
  }

  if (action === "archive") {
    const inboxIds = owned.filter((item) => item.archivedAt === null).map((item) => item.id);
    if (inboxIds.length === 0) return { count: 0 };
    const now = new Date();
    // Mark unread as read in the same pass, then archive.
    await prisma.notification.updateMany({
      where: { userId, id: { in: inboxIds }, readAt: null },
      data: { readAt: now },
    });
    const result = await prisma.notification.updateMany({
      where: { userId, id: { in: inboxIds }, archivedAt: null },
      data: { archivedAt: now },
    });
    return { count: result.count };
  }

  if (action === "unarchive") {
    const archivedIds = owned
      .filter((item) => item.archivedAt !== null)
      .map((item) => item.id);
    if (archivedIds.length === 0) return { count: 0 };
    const result = await prisma.notification.updateMany({
      where: { userId, id: { in: archivedIds } },
      data: { archivedAt: null },
    });
    return { count: result.count };
  }

  return { count: 0 };
}
