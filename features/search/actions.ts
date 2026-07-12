"use server";

import { revalidatePath } from "next/cache";

import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { hasMinRole } from "@/features/organizations/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { searchDocuments } from "@/lib/ai/retrieval";

import {
  createSavedSearch,
  deleteSavedSearch,
  getSavedSearchById,
  listSavedSearches,
} from "./lib/saved-searches";
import type { SavedSearchItem, SearchResponse } from "./lib/types";
import { createSavedSearchSchema, searchRequestSchema } from "./schemas";

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

async function requireProjectSearchAccess(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AuthError("NOT_FOUND", "Project not found");
  }
  const session = await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);
  return { project, session };
}

function revalidateSearchPaths(projectId: string) {
  revalidatePath(`/dashboard/projects/${projectId}/search`);
  revalidatePath("/dashboard/search");
}

export async function searchDocumentsAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<SearchResponse>> {
  try {
    await requireProjectSearchAccess(projectId);
    const parsed = searchRequestSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const response = await searchDocuments({
      projectId,
      query: parsed.data.query,
      mode: parsed.data.mode,
      filters: parsed.data.filters,
      limit: parsed.data.limit,
    });

    return { success: true, data: response };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    if (error instanceof Error) {
      return actionError("SEARCH_ERROR", error.message);
    }
    return actionError("SEARCH_ERROR", "Search failed");
  }
}

export async function listSavedSearchesAction(
  projectId: string,
): Promise<ActionResult<SavedSearchItem[]>> {
  try {
    const { session } = await requireProjectSearchAccess(projectId);
    const items = await listSavedSearches(projectId, session.userId);
    return { success: true, data: items };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    return actionError("PROCESSING_ERROR", "Failed to load saved searches");
  }
}

export async function createSavedSearchAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<SavedSearchItem>> {
  try {
    const { session } = await requireProjectSearchAccess(projectId);
    const parsed = createSavedSearchSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const item = await createSavedSearch(projectId, session.userId, parsed.data);
    revalidateSearchPaths(projectId);
    return { success: true, data: item };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    return actionError("PROCESSING_ERROR", "Failed to save search");
  }
}

export async function deleteSavedSearchAction(savedSearchId: string): Promise<ActionResult> {
  try {
    const saved = await getSavedSearchById(savedSearchId);
    if (!saved) {
      return actionError("NOT_FOUND", "Saved search not found");
    }

    const session = await requireOrgRole(saved.organizationId, DATA_ROOM_VIEW_MIN_ROLE);
    const isOwner = saved.userId === session.userId;
    const isAdmin = hasMinRole(session.membership.role, "ADMIN");

    if (!isOwner && !isAdmin) {
      return actionError("FORBIDDEN", "You cannot delete this saved search");
    }

    await deleteSavedSearch(savedSearchId);
    revalidateSearchPaths(saved.projectId);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    return actionError("PROCESSING_ERROR", "Failed to delete saved search");
  }
}
