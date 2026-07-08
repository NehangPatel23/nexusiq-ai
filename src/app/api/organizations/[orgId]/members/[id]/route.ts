import { prisma } from "@/lib/db";

import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  removeMember,
  updateMemberRole,
} from "@/features/organizations/lib/organizations";
import { hasMinRole } from "@/features/organizations/lib/roles";
import { updateMemberRoleSchema } from "@/features/organizations/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ orgId: string; id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { orgId, id } = await context.params;
    const auth = await requireOrgRole(orgId, "ADMIN");

    const body = await request.json();
    const parsed = updateMemberRoleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid member data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const member = await prisma.organizationMember.findFirst({
      where: { id, organizationId: orgId },
      include: {
        user: {
          select: { id: true, email: true, name: true, image: true },
        },
      },
    });

    if (!member) {
      return apiError("NOT_FOUND", "Member not found", 404);
    }

    if (member.role === "OWNER" && parsed.data.role !== "OWNER") {
      return apiError("FORBIDDEN", "Cannot change the organization owner's role", 403);
    }

    if (member.userId === auth.userId && parsed.data.role !== auth.membership.role) {
      return apiError("FORBIDDEN", "You cannot change your own role", 403);
    }

    if (parsed.data.role === "OWNER" && auth.membership.role !== "OWNER") {
      return apiError("FORBIDDEN", "Only the owner can assign the owner role", 403);
    }

    if (
      auth.membership.role !== "OWNER" &&
      !hasMinRole(auth.membership.role, parsed.data.role)
    ) {
      return apiError("FORBIDDEN", "Cannot assign a role higher than your own", 403);
    }

    const updated = await updateMemberRole(orgId, id, parsed.data.role);
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { orgId, id } = await context.params;
    const auth = await requireOrgRole(orgId, "ADMIN");

    const member = await prisma.organizationMember.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!member) {
      return apiError("NOT_FOUND", "Member not found", 404);
    }

    if (member.role === "OWNER") {
      return apiError("FORBIDDEN", "Cannot remove the organization owner", 403);
    }

    if (member.userId === auth.userId) {
      return apiError("FORBIDDEN", "You cannot remove yourself", 403);
    }

    await removeMember(orgId, id);
    return apiSuccess({ removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
