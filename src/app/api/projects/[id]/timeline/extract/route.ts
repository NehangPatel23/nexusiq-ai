export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { requireProjectTimelineAccess } from "@/features/timeline/lib/authorization";
import { extractTimelineEvents } from "@/features/timeline/lib/extract-timeline";
import { extractTimelineBodySchema } from "@/features/timeline/schemas";
import { OllamaUnavailableError } from "@/lib/ai/agents/run-agent";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectTimelineAccess(id);

    const parsed = extractTimelineBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await extractTimelineEvents({
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
