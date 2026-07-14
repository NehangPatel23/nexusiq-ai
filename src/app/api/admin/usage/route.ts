import { requireAdminOwner } from "@/features/admin/lib/auth";
import { getOrgUsageStats } from "@/features/admin/lib/usage";
import { adminUsageQuerySchema } from "@/features/admin/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = adminUsageQuerySchema.safeParse({
      organizationId: url.searchParams.get("organizationId") ?? undefined,
      days: url.searchParams.get("days") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid query", 400, parsed.error.flatten());
    }

    const auth = await requireAdminOwner(parsed.data.organizationId);
    const usage = await getOrgUsageStats(auth.organizationId, { days: parsed.data.days });

    return apiSuccess({
      organizationId: auth.organizationId,
      ...usage,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
