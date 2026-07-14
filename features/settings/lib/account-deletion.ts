import { unlink } from "fs/promises";
import path from "path";

import { prisma } from "@/lib/db";
import { logAudit } from "@/features/history/lib/audit";
import { isWithinGrace, purgeAfterFrom } from "@/features/history/lib/constants";
import { verifyPassword } from "@/features/auth/lib/password";

export class AccountDeletionError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AccountDeletionError";
  }
}

/**
 * Block account deletion when the user is the sole OWNER of any active org.
 */
export async function assertCanDeleteAccount(userId: string): Promise<void> {
  const ownedOrgs = await prisma.organizationMember.findMany({
    where: {
      userId,
      role: "OWNER",
      organization: { deletedAt: null },
    },
    select: {
      organizationId: true,
      organization: { select: { id: true, name: true } },
    },
  });

  for (const membership of ownedOrgs) {
    const ownerCount = await prisma.organizationMember.count({
      where: {
        organizationId: membership.organizationId,
        role: "OWNER",
      },
    });
    if (ownerCount <= 1) {
      throw new AccountDeletionError(
        "SOLE_OWNER",
        `Transfer or delete organization "${membership.organization.name}" before deleting your account.`,
      );
    }
  }
}

export async function tombstoneUser(userId: string, password: string): Promise<{ purgeAfter: Date }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AccountDeletionError("NOT_FOUND", "User not found");
  }
  if (user.deletedAt) {
    throw new AccountDeletionError("ALREADY_DELETED", "Account is already scheduled for deletion");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AccountDeletionError("UNAUTHORIZED", "Current password is incorrect");
  }

  await assertCanDeleteAccount(userId);

  const now = new Date();
  const purgeAfter = purgeAfterFrom(now);

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: now, purgeAfter },
  });

  // Log against each org the user belongs to (best-effort)
  const memberships = await prisma.organizationMember.findMany({
    where: { userId, organization: { deletedAt: null } },
    select: { organizationId: true },
  });
  await Promise.all(
    memberships.map((m) =>
      logAudit({
        organizationId: m.organizationId,
        userId,
        action: "USER_DELETED",
        entityType: "User",
        entityId: userId,
        metadata: { purgeAfter: purgeAfter.toISOString() },
      }),
    ),
  );

  return { purgeAfter };
}

export async function recoverUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.deletedAt) {
    throw new AccountDeletionError("NOT_DELETED", "Account is not scheduled for deletion");
  }
  if (!isWithinGrace(user.purgeAfter)) {
    throw new AccountDeletionError(
      "GRACE_EXPIRED",
      "The recovery window has expired. This account has been or will soon be permanently removed.",
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: null, purgeAfter: null },
  });

  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  await Promise.all(
    memberships.map((m) =>
      logAudit({
        organizationId: m.organizationId,
        userId,
        action: "USER_RECOVERED",
        entityType: "User",
        entityId: userId,
      }),
    ),
  );
}

export async function getDeletedUserState(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      deletedAt: true,
      purgeAfter: true,
    },
  });
}

export async function cleanupUserAvatar(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl?.startsWith("/api/avatars/")) return;
  const filename = imageUrl.replace("/api/avatars/", "");
  if (!filename || filename.includes("..") || filename.includes("/")) return;
  const storagePath = process.env.STORAGE_PATH ?? "./storage";
  const filePath = path.join(storagePath, "avatars", filename);
  try {
    await unlink(filePath);
  } catch {
    // file may already be gone
  }
}
