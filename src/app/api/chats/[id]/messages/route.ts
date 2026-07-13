export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { requireChatOwner } from "@/features/chat/lib/authorization";
import {
  deleteLastAssistantMessage,
  deleteMessagesFrom,
  getLastTurnMessages,
  getRecentChatHistory,
  listChatMessages,
  persistChatTurn,
  persistRegeneratedAssistant,
} from "@/features/chat/lib/chats";
import { formatSseEvent } from "@/features/chat/lib/sse";
import { messagePaginationSchema, sendMessageSchema } from "@/features/chat/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import {
  OllamaUnavailableError,
  prepareRagChat,
  runRagChat,
} from "@/lib/ai/chat/rag-chat";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireChatOwner(id);
    const url = new URL(request.url);
    const parsed = messagePaginationSchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid pagination", 400);
    }
    return apiSuccess(await listChatMessages(id, parsed.data.page, parsed.data.pageSize));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { chat } = await requireChatOwner(id);
    const parsed = sendMessageSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid message",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    if (parsed.data.editFromMessageId) {
      await deleteMessagesFrom(id, parsed.data.editFromMessageId);
    } else if (parsed.data.regenerate) {
      const recent = await getLastTurnMessages(id);
      if (
        recent.length < 2 ||
        recent[0]?.role !== "ASSISTANT" ||
        recent[1]?.role !== "USER" ||
        recent[1].content.trim() !== parsed.data.content
      ) {
        return apiError("VALIDATION_ERROR", "Cannot regenerate this response", 400);
      }
      await deleteLastAssistantMessage(id);
    }

    const retrievalQuery = parsed.data.contextPrefix
      ? `${parsed.data.contextPrefix}\n\n${parsed.data.content}`
      : parsed.data.content;

    const [history, prepared] = await Promise.all([
      getRecentChatHistory(id),
      prepareRagChat(chat.projectId, retrievalQuery, chat.agentType),
    ]);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: "token" | "done" | "error", data: unknown) => {
          controller.enqueue(encoder.encode(formatSseEvent(event, data)));
        };

        try {
          const result = await runRagChat({
            projectId: chat.projectId,
            userMessage: retrievalQuery,
            agentType: chat.agentType,
            history,
            prepared,
            onToken: (delta) => send("token", { delta }),
          });
          const persistence = {
            assistantContent: result.content,
            citations: result.citations,
            confidence: result.confidence,
            confidenceScore: result.confidenceScore,
            confidenceReason: result.confidenceReason,
          };
          const assistant = parsed.data.regenerate
            ? await persistRegeneratedAssistant({
                chatId: id,
                ...persistence,
              })
            : await persistChatTurn({
                chatId: id,
                userContent: parsed.data.content,
                ...persistence,
              });
          send("done", {
            messageId: assistant.id,
            citations: result.citations,
            confidence: result.confidence,
            confidenceScore: result.confidenceScore,
            confidenceReason: result.confidenceReason,
            content: result.content,
            retrievedChunks: result.retrievedChunks.map((chunk) => ({
              chunkId: chunk.chunkId,
              documentId: chunk.documentId,
              documentName: chunk.documentName,
              content: chunk.content,
              pageNumber: chunk.pageNumber,
              sectionTitle: chunk.sectionTitle,
            })),
          });
        } catch (error) {
          const unavailable = error instanceof OllamaUnavailableError;
          send("error", {
            code: unavailable ? error.code : "PROCESSING_ERROR",
            message: unavailable
              ? error.message
              : "The message could not be completed. Please try again.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof OllamaUnavailableError) {
      return apiError(error.code, error.message, 503);
    }
    return handleApiError(error);
  }
}
