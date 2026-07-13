export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { requireProjectIntelligenceAccess } from "@/features/intelligence/lib/authorization";
import { executeConsensusRun } from "@/features/intelligence/lib/execute-consensus-run";
import { runConsensusBodySchema } from "@/features/intelligence/schemas";
import { ConsensusPrerequisiteError } from "@/lib/ai/agents/consensus";
import { OllamaTimeoutError, OllamaUnavailableError } from "@/lib/ai/agents/run-agent";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { session } = await requireProjectIntelligenceAccess(id);
    const parsed = runConsensusBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid request body", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await executeConsensusRun({
      projectId: id,
      triggeredById: session.userId,
      force: parsed.data.force,
      agentRunIds: parsed.data.agentRunIds,
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof OllamaUnavailableError) {
      return apiError(error.code, error.message, 503);
    }
    if (error instanceof OllamaTimeoutError) {
      return apiError(error.code, error.message, 504);
    }
    if (error instanceof ConsensusPrerequisiteError) {
      return apiError(error.code, error.message, 400, { missingAgents: error.missingAgents });
    }
    return handleApiError(error);
  }
}
