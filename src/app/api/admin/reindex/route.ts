import {
  ReindexOllamaError,
  ReindexValidationError,
  runAdminReindex,
} from "@/features/admin/lib/reindex";
import { requireAdminOwner } from "@/features/admin/lib/auth";
import { adminReindexSchema } from "@/features/admin/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

/**
 * Maintenance: FTS rebuild and/or embedding re-embed.
 * - FTS does not require Ollama.
 * - Embeddings require reachable Ollama (503 if down).
 * - On Vercel with large corpora, embeddings may enqueue docs PENDING for the worker
 *   instead of completing inline (see features/admin/lib/reindex.ts + docs/deployment.md).
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = adminReindexSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid reindex body (mode + confirm: true required)",
        400,
        parsed.error.flatten(),
      );
    }

    const auth = await requireAdminOwner(parsed.data.organizationId);

    try {
      const result = await runAdminReindex({
        organizationId: auth.organizationId,
        userId: auth.userId,
        mode: parsed.data.mode,
        projectId: parsed.data.projectId,
        cursor: parsed.data.cursor,
        confirm: parsed.data.confirm,
      });
      return apiSuccess(result);
    } catch (error) {
      if (error instanceof ReindexValidationError) {
        return apiError(error.code, error.message, 400);
      }
      if (error instanceof ReindexOllamaError) {
        return apiError(error.code, error.message, 503);
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
