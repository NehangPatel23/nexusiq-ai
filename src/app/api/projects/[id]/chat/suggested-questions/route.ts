export const dynamic = "force-dynamic";

import { ChatAgentType } from "@prisma/client";

import { requireProjectChatAccess } from "@/features/chat/lib/authorization";
import {
  buildContextualSuggestedQuestions,
  getChatProjectContext,
} from "@/features/chat/lib/project-context";
import { apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectChatAccess(id);
    const requestedAgent = new URL(request.url).searchParams.get("agentType");
    const agentType = Object.values(ChatAgentType).find((value) => value === requestedAgent);
    const projectContext = await getChatProjectContext(id);
    return apiSuccess({
      questions: buildContextualSuggestedQuestions(agentType, projectContext),
      readyDocumentCount: projectContext.readyDocumentCount,
      pendingDocumentCount: projectContext.pendingDocumentCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
