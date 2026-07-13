export const dynamic = "force-dynamic";

import { requireProjectIntelligenceAccess } from "@/features/intelligence/lib/authorization";
import { listConsensusRuns } from "@/features/intelligence/lib/consensus-runs";
import { listConsensusRunsQuerySchema } from "@/features/intelligence/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectIntelligenceAccess(id);
    const url = new URL(request.url);
    const parsed = listConsensusRunsQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid query parameters", 400, parsed.error.flatten().fieldErrors);
    }

    const runs = await listConsensusRuns(id, parsed.data);
    return apiSuccess(runs);
  } catch (error) {
    return handleApiError(error);
  }
}
