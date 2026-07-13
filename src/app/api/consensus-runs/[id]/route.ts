export const dynamic = "force-dynamic";

import { AuthError } from "@/features/organizations/lib/authorization";
import { requireProjectIntelligenceAccess } from "@/features/intelligence/lib/authorization";
import { getConsensusRunById } from "@/features/intelligence/lib/consensus-runs";
import { apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const run = await getConsensusRunById(id);
    if (!run) {
      throw new AuthError("NOT_FOUND", "Consensus run not found");
    }

    await requireProjectIntelligenceAccess(run.projectId);
    return apiSuccess(run);
  } catch (error) {
    return handleApiError(error);
  }
}
