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
