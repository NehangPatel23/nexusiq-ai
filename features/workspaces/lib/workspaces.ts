import { prisma } from "@/lib/db";

import type { CreateWorkspaceInput, UpdateWorkspaceInput } from "../schemas";
import {
  generateUniqueWorkspaceSlug,
  isWorkspaceSlugAvailable,
  slugifyName,
} from "./slug";

const workspaceInclude = {
  team: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export type WorkspaceErrorCode = "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT";

export type WorkspaceServiceError = {
  error: WorkspaceErrorCode;
  message: string;
};

export type WorkspaceWithTeam = Awaited<ReturnType<typeof getWorkspaceById>> & {};

export async function listOrganizationWorkspaces(organizationId: string) {
  return prisma.workspace.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    include: workspaceInclude,
    orderBy: { createdAt: "asc" },
  });
}

export async function getWorkspaceById(workspaceId: string) {
  return prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      deletedAt: null,
    },
    include: workspaceInclude,
  });
}

export async function getDeletedWorkspaceById(workspaceId: string) {
  return prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      deletedAt: { not: null },
    },
    include: workspaceInclude,
  });
}

export async function listDeletedOrganizationWorkspaces(organizationId: string) {
  return prisma.workspace.findMany({
    where: {
      organizationId,
      deletedAt: { not: null },
    },
    include: workspaceInclude,
    orderBy: { deletedAt: "desc" },
  });
}

async function validateTeamInOrganization(
  organizationId: string,
  teamId: string | null | undefined,
): Promise<WorkspaceServiceError | null> {
  if (!teamId) {
    return null;
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
  });

  if (!team) {
    return { error: "NOT_FOUND" as const, message: "Team not found in this organization" };
  }

  return null;
}

export async function createWorkspace(
  organizationId: string,
  input: CreateWorkspaceInput,
): Promise<{ workspace: NonNullable<WorkspaceWithTeam> } | WorkspaceServiceError> {
  const teamError = await validateTeamInOrganization(organizationId, input.teamId);
  if (teamError) {
    return teamError;
  }

  const slug = input.slug
    ? slugifyName(input.slug)
    : await generateUniqueWorkspaceSlug(organizationId, input.name);

  if (!slug) {
    return { error: "VALIDATION_ERROR" as const, message: "Invalid workspace slug" };
  }

  if (input.slug) {
    const available = await isWorkspaceSlugAvailable(organizationId, slug);
    if (!available) {
      return { error: "CONFLICT" as const, message: "A workspace with this slug already exists" };
    }
  }

  const workspace = await prisma.workspace.create({
    data: {
      organizationId,
      name: input.name,
      slug,
      description: input.description,
      teamId: input.teamId ?? null,
    },
    include: workspaceInclude,
  });

  return { workspace };
}

export async function updateWorkspace(
  workspaceId: string,
  input: UpdateWorkspaceInput,
): Promise<{ workspace: NonNullable<WorkspaceWithTeam> } | WorkspaceServiceError> {
  const existing = await getWorkspaceById(workspaceId);
  if (!existing) {
    return { error: "NOT_FOUND" as const, message: "Workspace not found" };
  }

  const teamError = await validateTeamInOrganization(
    existing.organizationId,
    input.teamId === null ? null : (input.teamId ?? existing.teamId),
  );
  if (teamError) {
    return teamError;
  }

  const data: {
    name?: string;
    slug?: string;
    description?: string | null;
    teamId?: string | null;
  } = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.description !== undefined) {
    data.description = input.description;
  }

  if (input.teamId !== undefined) {
    data.teamId = input.teamId;
  }

  if (input.slug !== undefined) {
    const normalized = slugifyName(input.slug);
    if (!normalized) {
      return { error: "VALIDATION_ERROR" as const, message: "Invalid workspace slug" };
    }

    const available = await isWorkspaceSlugAvailable(
      existing.organizationId,
      normalized,
      workspaceId,
    );
    if (!available) {
      return { error: "CONFLICT" as const, message: "A workspace with this slug already exists" };
    }

    data.slug = normalized;
  } else if (input.name !== undefined && input.name !== existing.name) {
    data.slug = await generateUniqueWorkspaceSlug(
      existing.organizationId,
      input.name,
      workspaceId,
    );
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
    include: workspaceInclude,
  });

  return { workspace };
}

export async function softDeleteWorkspace(workspaceId: string) {
  const existing = await getWorkspaceById(workspaceId);
  if (!existing) {
    return null;
  }

  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { deletedAt: new Date() },
    include: workspaceInclude,
  });
}

export async function restoreWorkspace(
  workspaceId: string,
): Promise<{ workspace: NonNullable<WorkspaceWithTeam> } | WorkspaceServiceError> {
  const existing = await getDeletedWorkspaceById(workspaceId);
  if (!existing) {
    return { error: "NOT_FOUND" as const, message: "Deleted workspace not found" };
  }

  const slugConflict = await prisma.workspace.findFirst({
    where: {
      organizationId: existing.organizationId,
      slug: existing.slug,
      deletedAt: null,
      id: { not: workspaceId },
    },
  });

  if (slugConflict) {
    return {
      error: "CONFLICT" as const,
      message: "Another active workspace is using this slug. Rename it before restoring.",
    };
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { deletedAt: null },
    include: workspaceInclude,
  });

  return { workspace };
}

export async function hardDeleteWorkspace(workspaceId: string) {
  const existing = await getDeletedWorkspaceById(workspaceId);
  if (!existing) {
    return null;
  }

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });

  return existing;
}
