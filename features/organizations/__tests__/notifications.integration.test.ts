import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createUser } from "@/features/auth/lib/users";
import {
  archiveNotification,
  bulkUpdateNotifications,
  countUnreadNotifications,
  createNotification,
  deleteNotification,
  listUserNotifications,
  markAllNotificationsRead,
  unarchiveNotification,
} from "../lib/notifications";
import { prisma } from "@/lib/db";

const email = `notif-archive-${Date.now()}@example.com`;
let userId = "";

describe("notifications archive and delete", () => {
  beforeAll(async () => {
    const user = await createUser({
      name: "Notif User",
      email,
      password: "IntegrationTest123",
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("archives to a separate list, restores, and hard-deletes", async () => {
    const first = await createNotification({
      userId,
      type: "SYSTEM",
      title: "Analysis ready",
      body: "Full analysis finished.",
      link: "/dashboard/projects/p1/intelligence",
    });
    const second = await createNotification({
      userId,
      type: "SYSTEM",
      title: "Invite received",
      body: "You were invited to an organization.",
    });

    expect(await countUnreadNotifications(userId)).toBe(2);

    const inboxBefore = await listUserNotifications(userId, { limit: 10, archived: false });
    expect(inboxBefore.map((item) => item.id)).toEqual(
      expect.arrayContaining([first.id, second.id]),
    );

    const archived = await archiveNotification(first.id, userId);
    expect(archived?.archivedAt).toBeTruthy();
    expect(archived?.readAt).toBeTruthy();
    expect(await countUnreadNotifications(userId)).toBe(1);

    const inboxAfter = await listUserNotifications(userId, { archived: false });
    expect(inboxAfter.some((item) => item.id === first.id)).toBe(false);

    const archivedList = await listUserNotifications(userId, { archived: true });
    expect(archivedList.some((item) => item.id === first.id)).toBe(true);

    const restored = await unarchiveNotification(first.id, userId);
    expect(restored?.archivedAt).toBeNull();
    expect(
      (await listUserNotifications(userId, { archived: false })).some((item) => item.id === first.id),
    ).toBe(true);

    await markAllNotificationsRead(userId);
    expect(await countUnreadNotifications(userId)).toBe(0);

    const deleted = await deleteNotification(second.id, userId);
    expect(deleted?.id).toBe(second.id);
    expect(
      (await listUserNotifications(userId, { archived: false })).some((item) => item.id === second.id),
    ).toBe(false);
    expect(await deleteNotification(second.id, userId)).toBeNull();
  });

  it("prevents owning-user mismatch for archive and delete", async () => {
    const note = await createNotification({
      userId,
      type: "SYSTEM",
      title: "Owned",
      body: "Only owner can mutate.",
    });

    expect(await archiveNotification(note.id, "missing-user")).toBeNull();
    expect(await deleteNotification(note.id, "missing-user")).toBeNull();
    expect(await archiveNotification(note.id, userId)).toBeTruthy();
  });

  it("supports bulk archive and delete for owned notifications only", async () => {
    const a = await createNotification({
      userId,
      type: "SYSTEM",
      title: "Bulk A",
      body: "One",
    });
    const b = await createNotification({
      userId,
      type: "SYSTEM",
      title: "Bulk B",
      body: "Two",
    });

    const archived = await bulkUpdateNotifications(userId, [a.id, b.id], "archive");
    expect(archived.count).toBe(2);
    expect((await listUserNotifications(userId, { archived: true })).length).toBeGreaterThanOrEqual(2);

    const deleted = await bulkUpdateNotifications(userId, [a.id, b.id], "delete");
    expect(deleted.count).toBe(2);
    expect(
      (await listUserNotifications(userId, { archived: true })).some((item) => item.id === a.id),
    ).toBe(false);
  });
});
