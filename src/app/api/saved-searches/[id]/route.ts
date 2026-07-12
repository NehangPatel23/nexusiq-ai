export const dynamic = "force-dynamic";

import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { hasMinRole } from "@/features/organizations/lib/roles";
import {
  deleteSavedSearch,
  getSavedSearchById,
} from "@/features/search/lib/saved-searches";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const saved = await getSavedSearchById(id);

    if (!saved) {
      return apiError("NOT_FOUND", "Saved search not found", 404);
    }

    const session = await requireOrgRole(saved.organizationId, DATA_ROOM_VIEW_MIN_ROLE);
    const isOwner = saved.userId === session.userId;
    const isAdmin = hasMinRole(session.membership.role, "ADMIN");

    if (!isOwner && !isAdmin) {
      return apiError("FORBIDDEN", "You cannot delete this saved search", 403);
    }

    await deleteSavedSearch(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
