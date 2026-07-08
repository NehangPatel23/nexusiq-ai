import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  listOrganizationMembers,
  listPendingInvites,
} from "@/features/organizations/lib/organizations";
import { apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    await requireOrgRole(orgId, "VIEWER");

    const [members, pendingInvites] = await Promise.all([
      listOrganizationMembers(orgId),
      listPendingInvites(orgId),
    ]);

    return apiSuccess({
      members,
      pendingInvites,
      total: members.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
