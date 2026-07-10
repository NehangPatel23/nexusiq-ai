import { Prisma } from "@prisma/client";
import { cache } from "react";

import { prisma } from "@/lib/db";

import type { CreateProjectInput, UpdateProjectInput } from "../schemas";
import { getDefaultAgentFromMetadata } from "./default-agents";
import {
  generateUniqueProjectSlug,
  isProjectSlugAvailable,
  slugifyName,
} from "./slug";

const projectInclude = {
  workspace: {
    select: {
      id: true,
      name: true,
      slug: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

export type ProjectErrorCode = "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT";

export type ProjectServiceError = {
  error: ProjectErrorCode;
  message: string;
};

export type ProjectWithWorkspace = NonNullable<Awaited<ReturnType<typeof getProjectById>>>;

async function getUserOrganizationIds(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId,
      organization: { deletedAt: null },
    },
    select: { organizationId: true },
  });

  return memberships.map((membership) => membership.organizationId);
}

export async function listWorkspaceProjects(workspaceId: string) {
  return prisma.project.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function listDeletedWorkspaceProjects(workspaceId: string) {
  return prisma.project.findMany({
    where: {
      workspaceId,
      deletedAt: { not: null },
    },
    include: projectInclude,
    orderBy: { deletedAt: "desc" },
  });
}

export async function countProjectsByWorkspaceIds(workspaceIds: string[]) {
  if (workspaceIds.length === 0) {
    return {} as Record<string, number>;
  }

  const grouped = await prisma.project.groupBy({
    by: ["workspaceId"],
    where: {
      workspaceId: { in: workspaceIds },
      deletedAt: null,
    },
    _count: { id: true },
  });

  return Object.fromEntries(grouped.map((row) => [row.workspaceId, row._count.id]));
}

export async function listUserVisibleDeletedProjects(userId: string) {
  const organizationIds = await getUserOrganizationIds(userId);

  if (organizationIds.length === 0) {
    return [];
  }

  return prisma.project.findMany({
    where: {
      deletedAt: { not: null },
      workspace: {
        organizationId: { in: organizationIds },
      },
    },
    include: projectInclude,
    orderBy: { deletedAt: "desc" },
  });
}

/** @deprecated Use listUserVisibleDeletedProjects — kept for admin-only callers */
export async function listUserDeletedProjects(userId: string) {
  return listUserVisibleDeletedProjects(userId);
}

export async function listUserProjects(userId: string) {
  const organizationIds = await getUserOrganizationIds(userId);

  if (organizationIds.length === 0) {
    return [];
  }

  return prisma.project.findMany({
    where: {
      deletedAt: null,
      workspace: {
        deletedAt: null,
        organizationId: { in: organizationIds },
      },
    },
    include: projectInclude,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
}

export async function countUserProjects(userId: string) {
  const organizationIds = await getUserOrganizationIds(userId);

  if (organizationIds.length === 0) {
    return 0;
  }

  return prisma.project.count({
    where: {
      deletedAt: null,
      workspace: {
        deletedAt: null,
        organizationId: { in: organizationIds },
      },
    },
  });
}

export const getProjectById = cache(async (projectId: string) => {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
    },
    include: projectInclude,
  });
});

export async function getDeletedProjectById(projectId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: { not: null },
    },
    include: projectInclude,
  });
}

export async function getProjectOrganizationId(projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: {
      workspace: {
        select: { organizationId: true },
      },
    },
  });

  return project?.workspace.organizationId ?? null;
}

async function validateWorkspace(workspaceId: string): Promise<ProjectServiceError | null> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
  });

  if (!workspace) {
    return { error: "NOT_FOUND", message: "Workspace not found" };
  }

  return null;
}

export async function createProject(
  workspaceId: string,
  input: CreateProjectInput,
): Promise<{ project: ProjectWithWorkspace } | ProjectServiceError> {
  const workspaceError = await validateWorkspace(workspaceId);
  if (workspaceError) {
    return workspaceError;
  }

  const slug = input.slug
    ? slugifyName(input.slug)
    : await generateUniqueProjectSlug(workspaceId, input.name);

  if (!slug) {
    return { error: "VALIDATION_ERROR", message: "Invalid project slug" };
  }

  if (input.slug) {
    const available = await isProjectSlugAvailable(workspaceId, slug);
    if (!available) {
      return { error: "CONFLICT", message: "A project with this slug already exists in this workspace" };
    }
  }

  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: input.name,
      slug,
      description: input.description,
      type: input.type,
      targetCompany: input.targetCompany,
      dealStatus: input.dealStatus,
      tags: input.tags ?? [],
      metadata: input.defaultAgent
        ? ({ defaultAgent: input.defaultAgent } as Prisma.InputJsonValue)
        : undefined,
    },
    include: projectInclude,
  });

  return { project };
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<{ project: ProjectWithWorkspace } | ProjectServiceError> {
  const existing = await getProjectById(projectId);
  if (!existing) {
    return { error: "NOT_FOUND", message: "Project not found" };
  }

  const data: Prisma.ProjectUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.description !== undefined) {
    data.description = input.description;
  }

  if (input.type !== undefined) {
    data.type = input.type;
  }

  if (input.targetCompany !== undefined) {
    data.targetCompany = input.targetCompany;
  }

  if (input.dealStatus !== undefined) {
    data.dealStatus = input.dealStatus;
  }

  if (input.tags !== undefined) {
    data.tags = input.tags;
  }

  if (input.defaultAgent !== undefined) {
    const existingMeta =
      existing.metadata &&
      typeof existing.metadata === "object" &&
      !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};

    if (input.defaultAgent === null) {
      const { defaultAgent: _removed, ...rest } = existingMeta;
      data.metadata =
        Object.keys(rest).length > 0 ? (rest as Prisma.InputJsonValue) : Prisma.DbNull;
    } else {
      data.metadata = {
        ...existingMeta,
        defaultAgent: input.defaultAgent,
      } as Prisma.InputJsonValue;
    }
  }

  if (input.metadata !== undefined) {
    data.metadata =
      input.metadata === null
        ? Prisma.DbNull
        : (input.metadata as Prisma.InputJsonValue);
  }

  if (input.slug !== undefined) {
    const normalized = slugifyName(input.slug);
    if (!normalized) {
      return { error: "VALIDATION_ERROR", message: "Invalid project slug" };
    }

    const available = await isProjectSlugAvailable(existing.workspaceId, normalized, projectId);
    if (!available) {
      return { error: "CONFLICT", message: "A project with this slug already exists in this workspace" };
    }

    data.slug = normalized;
  } else if (input.name !== undefined && input.name !== existing.name) {
    data.slug = await generateUniqueProjectSlug(existing.workspaceId, input.name, projectId);
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data,
    include: projectInclude,
  });

  return { project };
}

export async function softDeleteProject(projectId: string) {
  const existing = await getProjectById(projectId);
  if (!existing) {
    return null;
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
    include: projectInclude,
  });
}

export async function restoreProject(
  projectId: string,
): Promise<{ project: ProjectWithWorkspace } | ProjectServiceError> {
  const existing = await getDeletedProjectById(projectId);
  if (!existing) {
    return { error: "NOT_FOUND", message: "Deleted project not found" };
  }

  const slugConflict = await prisma.project.findFirst({
    where: {
      workspaceId: existing.workspaceId,
      slug: existing.slug,
      deletedAt: null,
      id: { not: projectId },
    },
  });

  if (slugConflict) {
    return {
      error: "CONFLICT",
      message: "Another active project is using this slug. Rename it before restoring.",
    };
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: null },
    include: projectInclude,
  });

  return { project };
}

export async function hardDeleteProject(projectId: string) {
  const existing = await getDeletedProjectById(projectId);
  if (!existing) {
    return null;
  }

  await prisma.project.delete({
    where: { id: projectId },
  });

  return existing;
}

export async function toggleProjectPin(
  projectId: string,
): Promise<{ project: ProjectWithWorkspace } | ProjectServiceError> {
  const existing = await getProjectById(projectId);
  if (!existing) {
    return { error: "NOT_FOUND", message: "Project not found" };
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { pinned: !existing.pinned },
    include: projectInclude,
  });

  return { project };
}

export async function duplicateProject(
  projectId: string,
): Promise<{ project: ProjectWithWorkspace } | ProjectServiceError> {
  const existing = await getProjectById(projectId);
  if (!existing) {
    return { error: "NOT_FOUND", message: "Project not found" };
  }

  return createProject(existing.workspaceId, {
    name: `${existing.name} (copy)`,
    type: existing.type,
    description: existing.description ?? undefined,
    targetCompany: existing.targetCompany ?? undefined,
    dealStatus: existing.dealStatus ?? undefined,
    tags: existing.tags.length > 0 ? existing.tags : undefined,
    defaultAgent: getDefaultAgentFromMetadata(existing.metadata) ?? undefined,
  });
}

export async function bulkSoftDeleteProjects(projectIds: string[]) {
  const results: { id: string; success: boolean; message?: string }[] = [];

  for (const projectId of projectIds) {
    const deleted = await softDeleteProject(projectId);
    results.push({
      id: projectId,
      success: !!deleted,
      message: deleted ? undefined : "Project not found",
    });
  }

  return results;
}
