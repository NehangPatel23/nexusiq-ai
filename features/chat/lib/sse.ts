export type ChatSseEvent = "token" | "done" | "error";

/**
 * Chat SSE wire format:
 * event: token\ndata: {"delta":"..."}\n\n
 * event: done\ndata: {"messageId","citations","confidence","content"}\n\n
 * event: error\ndata: {"code","message"}\n\n
 */
export function formatSseEvent(event: ChatSseEvent, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
