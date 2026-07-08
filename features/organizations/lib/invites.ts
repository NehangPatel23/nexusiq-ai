import { randomBytes } from "crypto";

import type { OrgRole } from "@prisma/client";

import { findUserByEmail } from "@/features/auth/lib/users";
import { prisma } from "@/lib/db";

import { createNotification } from "./notifications";

const INVITE_EXPIRY_DAYS = 7;

export function buildInviteUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/invite/${token}`;
}

export function logInviteLink(email: string, token: string, organizationName: string) {
  const inviteUrl = buildInviteUrl(token);
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[dev] Organization invite for ${email} to "${organizationName}": ${inviteUrl}`,
    );
  }
}

export async function createOrganizationInvite(
  organizationId: string,
  organizationName: string,
  email: string,
  role: OrgRole,
  invitedByName?: string | null,
) {
  const normalizedEmail = email.toLowerCase().trim();

  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      user: { email: normalizedEmail },
    },
  });

  if (existingMember) {
    return { error: "CONFLICT" as const };
  }

  const pendingInvite = await prisma.invite.findFirst({
    where: {
      organizationId,
      email: normalizedEmail,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (pendingInvite) {
    return { error: "CONFLICT" as const };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: {
      organizationId,
      email: normalizedEmail,
      role,
      token,
      expiresAt,
    },
  });

  logInviteLink(normalizedEmail, token, organizationName);

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    await createNotification({
      userId: existingUser.id,
      type: "SYSTEM",
      title: `Invitation to ${organizationName}`,
      body: `${invitedByName ?? "A team member"} invited you to join as ${role.toLowerCase()}.`,
      link: `/invite/${token}`,
    });
  }

  return { invite };
}

export async function findValidInvite(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      organization: true,
    },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return null;
  }

  if (invite.organization.deletedAt) {
    return null;
  }

  return invite;
}

export async function acceptInvite(token: string, userId: string, userEmail: string) {
  const invite = await findValidInvite(token);
  if (!invite) {
    return { error: "INVALID_TOKEN" as const };
  }

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return { error: "EMAIL_MISMATCH" as const };
  }

  const existingMember = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invite.organizationId,
        userId,
      },
    },
  });

  if (existingMember) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    return { organizationId: invite.organizationId, alreadyMember: true };
  }

  await prisma.$transaction([
    prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
      },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return { organizationId: invite.organizationId, alreadyMember: false };
}

export async function acceptPendingInvitesForEmail(userId: string, email: string) {
  const pendingInvites = await prisma.invite.findMany({
    where: {
      email: email.toLowerCase(),
      acceptedAt: null,
      expiresAt: { gt: new Date() },
      organization: { deletedAt: null },
    },
  });

  for (const invite of pendingInvites) {
    await acceptInvite(invite.token, userId, email);
  }
}

export async function listPendingInvitesForEmail(email: string) {
  return prisma.invite.findMany({
    where: {
      email: email.toLowerCase(),
      acceptedAt: null,
      expiresAt: { gt: new Date() },
      organization: { deletedAt: null },
    },
    include: {
      organization: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function syncInviteNotificationsForEmail(userId: string, email: string) {
  const pendingInvites = await listPendingInvitesForEmail(email);

  for (const invite of pendingInvites) {
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId,
        link: `/invite/${invite.token}`,
      },
    });

    if (!existingNotification) {
      await createNotification({
        userId,
        type: "SYSTEM",
        title: `Invitation to ${invite.organization.name}`,
        body: `You have been invited to join as ${invite.role.toLowerCase()}.`,
        link: `/invite/${invite.token}`,
      });
    }
  }
}

export async function cancelOrganizationInvite(organizationId: string, inviteId: string) {
  const invite = await prisma.invite.findFirst({
    where: {
      id: inviteId,
      organizationId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!invite) {
    return null;
  }

  await prisma.invite.delete({ where: { id: inviteId } });
  return invite;
}

export async function updateOrganizationInviteRole(
  organizationId: string,
  inviteId: string,
  role: OrgRole,
) {
  const invite = await prisma.invite.findFirst({
    where: {
      id: inviteId,
      organizationId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!invite) {
    return null;
  }

  if (role === "OWNER") {
    return null;
  }

  return prisma.invite.update({
    where: { id: inviteId },
    data: { role },
  });
}
