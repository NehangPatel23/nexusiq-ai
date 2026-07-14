import type { OrgRole, OrganizationMember } from "@prisma/client";
import { cache } from "react";

import { restoreOrganization, tombstoneOrganization } from "@/features/history/lib/purge";
import { prisma } from "@/lib/db";

import type { CreateOrganizationInput, UpdateOrganizationInput } from "../schemas";
import { generateUniqueOrgSlug } from "./slug";

export const getOrganizationMembership = cache(
  async (organizationId: string, userId: string): Promise<OrganizationMember | null> => {
    return prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        organization: { deletedAt: null },
      },
    });
  },
);

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

export const getOrganizationById = cache(async (organizationId: string) => {
  return prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
  });
});

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

/**
 * Soft-delete (tombstone) an organization. Permanently removed after 24h by purge job.
 */
export async function deleteOrganization(organizationId: string, actorUserId?: string | null) {
  return tombstoneOrganization(organizationId, actorUserId);
}

export async function restoreDeletedOrganization(
  organizationId: string,
  actorUserId?: string | null,
) {
  return restoreOrganization(organizationId, actorUserId);
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
