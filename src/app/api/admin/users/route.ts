import { requireAdminOwner } from "@/features/admin/lib/auth";
import { listAdminMembers } from "@/features/admin/lib/members";
import { adminOrgQuerySchema } from "@/features/admin/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = adminOrgQuerySchema.safeParse({
      organizationId: url.searchParams.get("organizationId") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid organizationId", 400, parsed.error.flatten());
    }

    const auth = await requireAdminOwner(parsed.data.organizationId);
    const members = await listAdminMembers(auth.organizationId);

    return apiSuccess({
      organizationId: auth.organizationId,
      members: members.map((m) => ({
        ...m,
        joinedAt: m.joinedAt.toISOString(),
      })),
      manageHref: `/dashboard/organizations/${auth.organizationId}/settings`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
