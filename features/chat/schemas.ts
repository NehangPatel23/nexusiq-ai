import { ChatAgentType } from "@prisma/client";
import { z } from "zod";

export const createChatSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  agentType: z.nativeEnum(ChatAgentType).optional(),
});

export const updateChatSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    pinned: z.boolean().optional(),
    agentType: z.nativeEnum(ChatAgentType).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  regenerate: z.boolean().optional(),
  editFromMessageId: z.string().uuid().optional(),
  contextPrefix: z.string().trim().max(2000).optional(),
});

export const messagePaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
