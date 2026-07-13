import type { ChatAgentType, ConfidenceLevel, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { ChatCitation } from "@/lib/ai/citations";
import { formatAssistantContent } from "@/features/chat/lib/format-message";
import { buildChatTitle } from "@/features/chat/lib/chat-title";

import type { ChatMessageItem, ChatSessionItem } from "./types";

type AssistantPersistence = {
  assistantContent: string;
  citations: ChatCitation[];
  confidence: ConfidenceLevel;
  confidenceScore?: number;
  confidenceReason?: string;
};

function mapChat(chat: {
  id: string;
  projectId: string;
  title: string | null;
  agentType: ChatAgentType;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { messages: number };
}): ChatSessionItem {
  return {
    id: chat.id,
    projectId: chat.projectId,
    title: chat.title,
    agentType: chat.agentType,
    pinned: chat.pinned,
    messageCount: chat._count.messages,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  };
}

function parseCitations(value: Prisma.JsonValue | null): ChatCitation[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ChatCitation =>
      typeof item === "object" &&
      item !== null &&
      !Array.isArray(item) &&
      typeof item.documentId === "string" &&
      typeof item.chunkId === "string" &&
      typeof item.documentName === "string" &&
      typeof item.excerpt === "string",
  );
}

export async function listChats(projectId: string, userId: string): Promise<ChatSessionItem[]> {
  const chats = await prisma.chat.findMany({
    where: { projectId, userId },
    include: { _count: { select: { messages: true } } },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  return chats.map(mapChat);
}

export async function createChat(
  projectId: string,
  userId: string,
  input: { title?: string; agentType?: ChatAgentType },
): Promise<ChatSessionItem> {
  const chat = await prisma.chat.create({
    data: { projectId, userId, ...input },
    include: { _count: { select: { messages: true } } },
  });
  return mapChat(chat);
}

export async function getChatForAuthorization(id: string) {
  return prisma.chat.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          workspace: { select: { organizationId: true } },
        },
      },
    },
  });
}

export async function updateChat(
  id: string,
  input: { title?: string; pinned?: boolean; agentType?: ChatAgentType },
): Promise<ChatSessionItem> {
  const chat = await prisma.chat.update({
    where: { id },
    data: input,
    include: { _count: { select: { messages: true } } },
  });
  return mapChat(chat);
}

export async function deleteChat(id: string) {
  await prisma.chat.delete({ where: { id } });
}

export async function listChatMessages(id: string, page: number, pageSize: number) {
  const [messages, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { chatId: id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chatMessage.count({ where: { chatId: id } }),
  ]);

  const items: ChatMessageItem[] = messages.map((message) => ({
    id: message.id,
    role: message.role,
    content:
      message.role === "ASSISTANT" ? formatAssistantContent(message.content) : message.content,
    citations: parseCitations(message.citations),
    confidence: message.confidence,
    confidenceScore: message.confidenceScore,
    confidenceReason: message.confidenceReason,
    createdAt: message.createdAt.toISOString(),
  }));

  return { items, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getRecentChatHistory(id: string, limit = 6) {
  const messages = await prisma.chatMessage.findMany({
    where: { chatId: id },
    select: { role: true, content: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  return messages.reverse();
}

export async function getLastTurnMessages(chatId: string) {
  return prisma.chatMessage.findMany({
    where: { chatId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 2,
  });
}

export async function deleteLastAssistantMessage(chatId: string) {
  const lastAssistant = await prisma.chatMessage.findFirst({
    where: { chatId, role: "ASSISTANT" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!lastAssistant) {
    throw new Error("No assistant message to regenerate");
  }
  await prisma.chatMessage.delete({ where: { id: lastAssistant.id } });
  return lastAssistant;
}

export async function deleteMessagesFrom(chatId: string, messageId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: { chatId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const index = messages.findIndex((message) => message.id === messageId);
  if (index < 0) {
    throw new Error("Message not found");
  }
  const ids = messages.slice(index).map((message) => message.id);
  await prisma.chatMessage.deleteMany({ where: { id: { in: ids } } });
}

export async function persistRegeneratedAssistant(input: {
  chatId: string;
} & AssistantPersistence) {
  return prisma.$transaction(async (tx) => {
    const assistant = await tx.chatMessage.create({
      data: {
        chatId: input.chatId,
        role: "ASSISTANT",
        content: input.assistantContent,
        citations: input.citations as Prisma.InputJsonValue,
        confidence: input.confidence,
        confidenceScore: input.confidenceScore,
        confidenceReason: input.confidenceReason,
      },
    });
    await tx.chat.update({
      where: { id: input.chatId },
      data: { updatedAt: new Date() },
    });
    return assistant;
  });
}

export async function persistChatTurn(input: {
  chatId: string;
  userContent: string;
} & AssistantPersistence) {
  const title = buildChatTitle(input.userContent);
  return prisma.$transaction(async (tx) => {
    await tx.chatMessage.create({
      data: { chatId: input.chatId, role: "USER", content: input.userContent },
    });
    const assistant = await tx.chatMessage.create({
      data: {
        chatId: input.chatId,
        role: "ASSISTANT",
        content: input.assistantContent,
        citations: input.citations as Prisma.InputJsonValue,
        confidence: input.confidence,
        confidenceScore: input.confidenceScore,
        confidenceReason: input.confidenceReason,
      },
    });
    await tx.chat.update({
      where: { id: input.chatId },
      data: { updatedAt: new Date() },
    });
    await tx.chat.updateMany({
      where: { id: input.chatId, title: null },
      data: { title },
    });
    return assistant;
  });
}

export async function exportChatMarkdown(chatId: string): Promise<string> {
  const [chat, messages] = await Promise.all([
    prisma.chat.findUnique({
      where: { id: chatId },
      include: { project: { select: { name: true } } },
    }),
    prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!chat) throw new Error("Chat not found");

  const lines = [
    `# ${chat.title ?? "Chat export"}`,
    `Project: ${chat.project.name}`,
    `Agent: ${chat.agentType}`,
    `Exported: ${new Date().toISOString()}`,
    "",
  ];

  for (const message of messages) {
    const heading = message.role === "USER" ? "## You" : "## Assistant";
    lines.push(heading, "");
    lines.push(
      message.role === "ASSISTANT"
        ? formatAssistantContent(message.content)
        : message.content,
      "",
    );
    if (message.role === "ASSISTANT" && message.confidence) {
      lines.push(
        `> Confidence: ${message.confidence}${message.confidenceScore != null ? ` (${message.confidenceScore}%)` : ""}`,
      );
      if (message.confidenceReason) lines.push(`> ${message.confidenceReason}`);
      lines.push("");
    }
    const citations = parseCitations(message.citations);
    if (citations.length > 0) {
      lines.push("### Sources");
      for (const citation of citations) {
        lines.push(`- ${citation.documentName}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
