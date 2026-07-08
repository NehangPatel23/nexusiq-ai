import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  cancelOrganizationInvite,
  updateOrganizationInviteRole,
} from "@/features/organizations/lib/invites";
import { updateMemberRoleSchema } from "@/features/organizations/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ orgId: string; inviteId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { orgId, inviteId } = await context.params;
    await requireOrgRole(orgId, "ADMIN");

    const body = await request.json();
    const parsed = updateMemberRoleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid invite data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    if (parsed.data.role === "OWNER") {
      return apiError("FORBIDDEN", "Cannot invite users as Owner", 403);
    }

    const updated = await updateOrganizationInviteRole(orgId, inviteId, parsed.data.role);
    if (!updated) {
      return apiError("NOT_FOUND", "Invite not found or expired", 404);
    }

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { orgId, inviteId } = await context.params;
    await requireOrgRole(orgId, "ADMIN");

    const cancelled = await cancelOrganizationInvite(orgId, inviteId);
    if (!cancelled) {
      return apiError("NOT_FOUND", "Invite not found or expired", 404);
    }

    return apiSuccess({ cancelled: true });
  } catch (error) {
    return handleApiError(error);
  }
}
