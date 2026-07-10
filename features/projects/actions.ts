"use server";

import { revalidatePath } from "next/cache";

import {
  AuthError,
  requireOrgRole,
} from "@/features/organizations/lib/authorization";
import { getWorkspaceById } from "@/features/workspaces/lib/workspaces";
import {
  PROJECT_CREATE_MIN_ROLE,
  PROJECT_EDIT_MIN_ROLE,
  PROJECT_MANAGE_MIN_ROLE,
} from "@/features/projects/lib/roles";
import {
  getDeletedProjectById,
  getProjectById,
  getProjectOrganizationId,
} from "@/features/projects/lib/projects";

import {
  createProjectSchema,
  updateProjectSchema,
} from "./schemas";
import {
  createProject,
  duplicateProject,
  hardDeleteProject,
  restoreProject,
  softDeleteProject,
  toggleProjectPin,
  bulkSoftDeleteProjects,
  updateProject,
} from "./lib/projects";
import { toProjectSnapshot, type ProjectSnapshot } from "./lib/project-snapshot";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };

function validationError(fieldErrors: Record<string, string[]>) {
  return {
    success: false as const,
    error: {
      code: "VALIDATION_ERROR",
      message: "Please fix the errors below",
      fieldErrors,
    },
  };
}

function actionError<T = void>(code: string, message: string): ActionResult<T> {
  return { success: false, error: { code, message } };
}

function revalidateProjectPaths(projectId?: string) {
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  if (projectId) {
    revalidatePath(`/dashboard/projects/${projectId}`);
  }
}

export async function createProjectAction(
  workspaceId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return actionError("NOT_FOUND", "Workspace not found");
    }

    await requireOrgRole(workspace.organizationId, PROJECT_CREATE_MIN_ROLE);
    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await createProject(workspaceId, parsed.data);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidateProjectPaths(result.project.id);
    return { success: true, data: { id: result.project.id } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ project: ProjectSnapshot }>> {
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      return actionError("NOT_FOUND", "Project not found");
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_EDIT_MIN_ROLE);
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await updateProject(projectId, parsed.data);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidateProjectPaths(projectId);
    return { success: true, data: { project: toProjectSnapshot(result.project) } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      return actionError("NOT_FOUND", "Project not found");
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_MANAGE_MIN_ROLE);
    await softDeleteProject(projectId);
    revalidateProjectPaths(projectId);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function restoreProjectAction(projectId: string): Promise<ActionResult> {
  try {
    const project = await getDeletedProjectById(projectId);
    if (!project) {
      return actionError("NOT_FOUND", "Deleted project not found");
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_MANAGE_MIN_ROLE);
    const result = await restoreProject(projectId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidateProjectPaths(projectId);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function hardDeleteProjectAction(projectId: string): Promise<ActionResult> {
  try {
    const project = await getDeletedProjectById(projectId);
    if (!project) {
      return actionError("NOT_FOUND", "Deleted project not found");
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_MANAGE_MIN_ROLE);
    await hardDeleteProject(projectId);
    revalidateProjectPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function getProjectOrgIdAction(projectId: string): Promise<string | null> {
  return getProjectOrganizationId(projectId);
}

export async function toggleProjectPinAction(projectId: string): Promise<ActionResult<{ pinned: boolean }>> {
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      return actionError("NOT_FOUND", "Project not found");
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_EDIT_MIN_ROLE);
    const result = await toggleProjectPin(projectId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidateProjectPaths(projectId);
    return { success: true, data: { pinned: result.project.pinned } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function duplicateProjectAction(
  projectId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      return actionError("NOT_FOUND", "Project not found");
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_CREATE_MIN_ROLE);
    const result = await duplicateProject(projectId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidateProjectPaths(result.project.id);
    return { success: true, data: { id: result.project.id } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function bulkDeleteProjectsAction(projectIds: string[]): Promise<ActionResult<{ deleted: number }>> {
  try {
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return actionError("VALIDATION_ERROR", "Select at least one project");
    }

    let deleted = 0;
    for (const projectId of projectIds) {
      const project = await getProjectById(projectId);
      if (!project) {
        continue;
      }

      await requireOrgRole(project.workspace.organizationId, PROJECT_MANAGE_MIN_ROLE);
    }

    const results = await bulkSoftDeleteProjects(projectIds);
    deleted = results.filter((result) => result.success).length;

    revalidateProjectPaths();
    return { success: true, data: { deleted } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}
