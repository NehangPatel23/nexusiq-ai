import type { ChatAgentType, ChatMessageRole, ConfidenceLevel } from "@prisma/client";

import type { ChatCitation } from "@/lib/ai/citations";

export type ChatSessionItem = {
  id: string;
  projectId: string;
  title: string | null;
  agentType: ChatAgentType;
  pinned: boolean;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageItem = {
  id: string;
  role: ChatMessageRole;
  content: string;
  citations: ChatCitation[];
  confidence: ConfidenceLevel | null;
  confidenceScore?: number | null;
  confidenceReason?: string | null;
  createdAt: string;
};

export type SourceChunk = {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  pageNumber: number | null;
  sectionTitle: string | null;
};

export type ChatDoneEvent = {
  messageId: string;
  citations: ChatCitation[];
  confidence: ConfidenceLevel;
  confidenceScore: number;
  confidenceReason?: string;
  content: string;
  retrievedChunks: SourceChunk[];
};
