import type { OrgRole, OrganizationMember } from "@prisma/client";

import { prisma } from "@/lib/db";

import type { CreateOrganizationInput, UpdateOrganizationInput } from "../schemas";
import { generateUniqueOrgSlug } from "./slug";

export async function getOrganizationMembership(
  organizationId: string,
  userId: string,
): Promise<OrganizationMember | null> {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
  });

  if (!organization) {
    return null;
  }

  return prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });
}

export async function listUserOrganizations(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId,
      organization: { deletedAt: null },
    },
    include: {
      organization: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    description: membership.organization.description,
    role: membership.role,
    createdAt: membership.organization.createdAt,
    updatedAt: membership.organization.updatedAt,
  }));
}

export async function countUserOrganizations(userId: string) {
  return prisma.organizationMember.count({
    where: {
      userId,
      organization: { deletedAt: null },
    },
  });
}

export async function getOrganizationById(organizationId: string) {
  return prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
  });
}

export async function createOrganization(userId: string, input: CreateOrganizationInput) {
  const slug = await generateUniqueOrgSlug(input.name);

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
      },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId,
        role: "OWNER",
      },
    });

    return organization;
  });
}

export async function updateOrganization(organizationId: string, input: UpdateOrganizationInput) {
  const data: { name?: string; description?: string | null } = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }

  return prisma.organization.update({
    where: { id: organizationId },
    data,
  });
}

export async function deleteOrganization(organizationId: string) {
  const invites = await prisma.invite.findMany({
    where: { organizationId },
    select: { token: true },
  });

  if (invites.length > 0) {
    await prisma.notification.deleteMany({
      where: {
        link: { in: invites.map((invite) => `/invite/${invite.token}`) },
      },
    });
  }

  return prisma.organization.delete({
    where: { id: organizationId },
  });
}

export async function listOrganizationMembers(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

export async function listPendingInvites(organizationId: string) {
  return prisma.invite.findMany({
    where: {
      organizationId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  role: OrgRole,
) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId },
  });

  if (!member) {
    return null;
  }

  return prisma.organizationMember.update({
    where: { id: memberId },
    data: { role },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        },
      },
    },
  });
}

export async function removeMember(organizationId: string, memberId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId },
  });

  if (!member) {
    return null;
  }

  await prisma.organizationMember.delete({
    where: { id: memberId },
  });

  return member;
}

export async function listOrganizationTeams(organizationId: string) {
  return prisma.team.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: { members: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createTeam(
  organizationId: string,
  input: { name: string; description?: string },
) {
  return prisma.team.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
    },
    include: {
      _count: {
        select: { members: true },
      },
    },
  });
}
