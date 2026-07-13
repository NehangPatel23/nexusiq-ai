export const dynamic = "force-dynamic";

import { requireProjectIntelligenceAccess } from "@/features/intelligence/lib/authorization";
import { getAgentRunWithFindings } from "@/features/intelligence/lib/agent-runs";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const run = await getAgentRunWithFindings(id);
    if (!run) {
      return apiError("NOT_FOUND", "Agent run not found", 404);
    }

    await requireProjectIntelligenceAccess(run.projectId);
    return apiSuccess(run);
  } catch (error) {
    return handleApiError(error);
  }
}
