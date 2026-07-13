export const dynamic = "force-dynamic";
export const maxDuration = 60;

import type { AgentType } from "@prisma/client";

import { requireProjectIntelligenceAccess } from "@/features/intelligence/lib/authorization";
import { executeAgentRun } from "@/features/intelligence/lib/execute-agent-run";
import { runAgentBodySchema } from "@/features/intelligence/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { OllamaUnavailableError } from "@/lib/ai/agents/run-agent";

export async function handleAgentRunPost(projectId: string, agentType: AgentType, request: Request) {
  try {
    const { session } = await requireProjectIntelligenceAccess(projectId);
    const parsed = runAgentBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid request body", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await executeAgentRun({
      projectId,
      agentType,
      triggeredById: session.userId,
      force: parsed.data.force,
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof OllamaUnavailableError) {
      return apiError(error.code, error.message, 503);
    }
    if (error instanceof Error && error.message.includes("already running")) {
      return apiError("CONFLICT", error.message, 409);
    }
    return handleApiError(error);
  }
}
