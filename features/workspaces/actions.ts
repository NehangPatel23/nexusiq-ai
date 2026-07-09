"use server";

import { revalidatePath } from "next/cache";

import {
  AuthError,
  requireOrgRole,
} from "@/features/organizations/lib/authorization";
import { getDeletedWorkspaceById, getWorkspaceById } from "@/features/workspaces/lib/workspaces";
import {
  WORKSPACE_CREATE_MIN_ROLE,
  WORKSPACE_EDIT_MIN_ROLE,
  WORKSPACE_MANAGE_MIN_ROLE,
} from "@/features/workspaces/lib/roles";

import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "./schemas";
import {
  createWorkspace,
  hardDeleteWorkspace,
  restoreWorkspace,
  softDeleteWorkspace,
  updateWorkspace,
} from "./lib/workspaces";

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

function revalidateWorkspacePaths(orgId: string) {
  revalidatePath(`/dashboard/organizations/${orgId}/workspaces`);
  revalidatePath("/dashboard/organizations");
}

export async function createWorkspaceAction(
  orgId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireOrgRole(orgId, WORKSPACE_CREATE_MIN_ROLE);
    const parsed = createWorkspaceSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await createWorkspace(orgId, parsed.data);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidateWorkspacePaths(orgId);
    return { success: true, data: { id: result.workspace.id } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function updateWorkspaceAction(
  workspaceId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return actionError("NOT_FOUND", "Workspace not found");
    }

    await requireOrgRole(workspace.organizationId, WORKSPACE_EDIT_MIN_ROLE);
    const parsed = updateWorkspaceSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const result = await updateWorkspace(workspaceId, parsed.data);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidateWorkspacePaths(workspace.organizationId);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function deleteWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  try {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return actionError("NOT_FOUND", "Workspace not found");
    }

    await requireOrgRole(workspace.organizationId, WORKSPACE_MANAGE_MIN_ROLE);
    await softDeleteWorkspace(workspaceId);
    revalidateWorkspacePaths(workspace.organizationId);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function restoreWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  try {
    const workspace = await getDeletedWorkspaceById(workspaceId);
    if (!workspace) {
      return actionError("NOT_FOUND", "Deleted workspace not found");
    }

    await requireOrgRole(workspace.organizationId, WORKSPACE_MANAGE_MIN_ROLE);
    const result = await restoreWorkspace(workspaceId);
    if ("error" in result) {
      return actionError(result.error, result.message);
    }

    revalidateWorkspacePaths(workspace.organizationId);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function hardDeleteWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  try {
    const workspace = await getDeletedWorkspaceById(workspaceId);
    if (!workspace) {
      return actionError("NOT_FOUND", "Deleted workspace not found");
    }

    await requireOrgRole(workspace.organizationId, WORKSPACE_MANAGE_MIN_ROLE);
    await hardDeleteWorkspace(workspaceId);
    revalidateWorkspacePaths(workspace.organizationId);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}
