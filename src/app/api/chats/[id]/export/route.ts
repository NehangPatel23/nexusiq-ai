export const dynamic = "force-dynamic";

import { requireChatOwner } from "@/features/chat/lib/authorization";
import { exportChatMarkdown } from "@/features/chat/lib/chats";
import { handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireChatOwner(id);
    const markdown = await exportChatMarkdown(id);
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="chat-${id.slice(0, 8)}.md"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
