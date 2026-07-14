export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { requireProjectContradictionsAccess } from "@/features/contradictions/lib/authorization";
import { notifyCriticalContradictions } from "@/features/contradictions/lib/contradiction-notifications";
import { scanContradictionsBodySchema } from "@/features/contradictions/schemas";
import { OllamaUnavailableError } from "@/lib/ai/agents/run-agent";
import { scanContradictions } from "@/lib/ai/contradictions";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getSession } from "@/lib/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectContradictionsAccess(id);
    const session = await getSession();

    const parsed = scanContradictionsBodySchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await scanContradictions({
      projectId: id,
      force: parsed.data.force,
    });

    if (session?.user?.id && result.contradictions.length > 0) {
      await notifyCriticalContradictions({
        projectId: id,
        userId: session.user.id,
        contradictions: result.contradictions,
      });
    }

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof OllamaUnavailableError) {
      return apiError(error.code, error.message, 503);
    }
    return handleApiError(error);
  }
}
