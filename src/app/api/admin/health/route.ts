import { requireAdminOwner } from "@/features/admin/lib/auth";
import { getAdminHealth } from "@/features/admin/lib/health";
import { listRecentFailedDocuments } from "@/features/admin/lib/queue";
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
    const health = await getAdminHealth(auth.organizationId);
    const failedDocuments = await listRecentFailedDocuments(auth.organizationId);

    return apiSuccess({
      ...health,
      organizationId: auth.organizationId,
      ownerOrganizations: auth.ownerOrganizations,
      failedDocuments: failedDocuments.map((d) => ({
        ...d,
        updatedAt: d.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
