import { requireAdminOwner } from "@/features/admin/lib/auth";
import { retryFailedDocumentsInOrg } from "@/features/admin/lib/queue";
import { logAudit } from "@/features/history/lib/audit";
import { adminRetryQueueSchema } from "@/features/admin/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

/**
 * Retry FAILED documents → PENDING for worker.
 * Does not inline-process on Vercel (ENABLE_INLINE_PROCESSING false there).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = adminRetryQueueSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "confirm: true required",
        400,
        parsed.error.flatten(),
      );
    }

    const auth = await requireAdminOwner(parsed.data.organizationId);
    const result = await retryFailedDocumentsInOrg({
      organizationId: auth.organizationId,
      documentIds: parsed.data.documentIds,
    });

    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "MAINTENANCE",
      entityType: "Document",
      metadata: {
        detail: "retry_failed",
        updated: result.updated,
        documentIds: parsed.data.documentIds ?? null,
      },
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
