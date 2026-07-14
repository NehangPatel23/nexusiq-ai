export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { requireProjectGraphAccess } from "@/features/graph/lib/authorization";
import { extractGraphEntities } from "@/features/graph/lib/extract-graph";
import { extractGraphBodySchema } from "@/features/graph/schemas";
import { OllamaUnavailableError } from "@/lib/ai/agents/run-agent";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectGraphAccess(id);

    const parsed = extractGraphBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await extractGraphEntities({
      projectId: id,
      force: parsed.data.force,
      all: parsed.data.all,
      seedQuery: parsed.data.seedQuery,
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof OllamaUnavailableError) {
      return apiError(error.code, error.message, 503);
    }
    return handleApiError(error);
  }
}
