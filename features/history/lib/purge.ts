import { prisma } from "@/lib/db";
import { logAudit } from "@/features/history/lib/audit";
import { purgeAfterFrom } from "@/features/history/lib/constants";
import { cleanupUserAvatar } from "@/features/settings/lib/account-deletion";

/**
 * Soft-delete (tombstone) an organization. Permanently purged after 24h.
 */
export async function tombstoneOrganization(
  organizationId: string,
  actorUserId?: string | null,
): Promise<{ purgeAfter: Date }> {
  const now = new Date();
  const purgeAfter = purgeAfterFrom(now);

  await prisma.organization.update({
    where: { id: organizationId },
    data: { deletedAt: now, purgeAfter },
  });

  await logAudit({
    organizationId,
    userId: actorUserId ?? null,
    action: "ORG_DELETED",
    entityType: "Organization",
    entityId: organizationId,
    metadata: { purgeAfter: purgeAfter.toISOString() },
  });

  return { purgeAfter };
}

export async function restoreOrganization(
  organizationId: string,
  actorUserId?: string | null,
): Promise<void> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org?.deletedAt) {
    throw new Error("Organization is not scheduled for deletion");
  }
  if (!org.purgeAfter || org.purgeAfter.getTime() <= Date.now()) {
    throw new Error("The recovery window has expired");
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { deletedAt: null, purgeAfter: null },
  });

  await logAudit({
    organizationId,
    userId: actorUserId ?? null,
    action: "ORG_RECOVERED",
    entityType: "Organization",
    entityId: organizationId,
  });
}

export async function getTombstonedOrganizationForOwner(organizationId: string, userId: string) {
  return prisma.organization.findFirst({
    where: {
      id: organizationId,
      deletedAt: { not: null },
      members: { some: { userId, role: "OWNER" } },
    },
  });
}

export async function listTombstonedOrganizationsForOwner(userId: string) {
  return prisma.organization.findMany({
    where: {
      deletedAt: { not: null },
      purgeAfter: { gt: new Date() },
      members: { some: { userId, role: "OWNER" } },
    },
    orderBy: { deletedAt: "desc" },
  });
}

/**
 * Hard-delete expired tombstoned users and organizations.
 * Returns counts of purged entities.
 */
export async function purgeExpiredEntities(now: Date = new Date()): Promise<{
  usersPurged: number;
  orgsPurged: number;
}> {
  const expiredUsers = await prisma.user.findMany({
    where: {
      deletedAt: { not: null },
      purgeAfter: { lte: now },
    },
    select: {
      id: true,
      image: true,
      organizationMembers: { select: { organizationId: true } },
    },
  });

  const expiredOrgs = await prisma.organization.findMany({
    where: {
      deletedAt: { not: null },
      purgeAfter: { lte: now },
    },
    select: { id: true },
  });

  // Emit USER_PURGED while org memberships / audit tables still exist
  for (const user of expiredUsers) {
    await Promise.all(
      user.organizationMembers.map((m) =>
        logAudit({
          organizationId: m.organizationId,
          userId: user.id,
          action: "USER_PURGED",
          entityType: "User",
          entityId: user.id,
        }),
      ),
    );
  }

  let orgsPurged = 0;
  for (const org of expiredOrgs) {
    const invites = await prisma.invite.findMany({
      where: { organizationId: org.id },
      select: { token: true },
    });
    if (invites.length > 0) {
      await prisma.notification.deleteMany({
        where: { link: { in: invites.map((i) => `/invite/${i.token}`) } },
      });
    }

    // Best-effort: ORG_PURGED is cascade-deleted with the org; emit for observers/logs.
    await logAudit({
      organizationId: org.id,
      action: "ORG_PURGED",
      entityType: "Organization",
      entityId: org.id,
    });

    await prisma.organization.delete({ where: { id: org.id } });
    orgsPurged += 1;
  }

  let usersPurged = 0;
  for (const user of expiredUsers) {
    await cleanupUserAvatar(user.image);
    const still = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (still) {
      await prisma.user.delete({ where: { id: user.id } });
    }
    usersPurged += 1;
  }

  return { usersPurged, orgsPurged };
}
