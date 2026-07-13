export const dynamic = "force-dynamic";

import { requireProjectChatAccess } from "@/features/chat/lib/authorization";
import { createChat, listChats } from "@/features/chat/lib/chats";
import { createChatSchema } from "@/features/chat/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const { session } = await requireProjectChatAccess(projectId);
    return apiSuccess({ items: await listChats(projectId, session.userId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const { session } = await requireProjectChatAccess(projectId);
    const parsed = createChatSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid chat",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }
    const chat = await createChat(projectId, session.userId, parsed.data);
    return apiSuccess(chat, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
