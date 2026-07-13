export const dynamic = "force-dynamic";

import { requireChatOwner } from "@/features/chat/lib/authorization";
import { deleteChat, updateChat } from "@/features/chat/lib/chats";
import { updateChatSchema } from "@/features/chat/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireChatOwner(id);
    const parsed = updateChatSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid chat update",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }
    return apiSuccess(await updateChat(id, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireChatOwner(id);
    await deleteChat(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
