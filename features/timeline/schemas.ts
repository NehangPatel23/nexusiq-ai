import { z } from "zod";

export const timelineCategorySchema = z.enum([
  "FUNDING",
  "HIRING",
  "ACQUISITION",
  "LAWSUIT",
  "LEADERSHIP",
  "REVENUE",
  "CONTRACT",
  "OTHER",
]);

export const createTimelineEventBodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional().nullable(),
  eventDate: z.string().min(1),
  category: timelineCategorySchema,
  documentId: z.string().uuid().optional().nullable(),
  sourceChunkId: z.string().uuid().optional().nullable(),
});

export const updateTimelineEventBodySchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  eventDate: z.string().min(1).optional(),
  category: timelineCategorySchema.optional(),
  pinned: z.boolean().optional(),
  documentId: z.string().uuid().optional().nullable(),
  sourceChunkId: z.string().uuid().optional().nullable(),
});

export const extractTimelineBodySchema = z.object({
  force: z.boolean().optional(),
  /** Run multiple seed-query batches to cover more chunks. */
  all: z.boolean().optional(),
  seedQuery: z.string().trim().min(1).max(500).optional(),
});

export const timelineListQuerySchema = z.object({
  category: timelineCategorySchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  trash: z.enum(["active", "archived", "all"]).optional(),
});

/** Raw Ollama timeline extract item (pre-category). */
export const extractedTimelineEventSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional().nullable(),
  eventDate: z.string().min(1),
  sourceChunkId: z.string().min(1),
  documentId: z.string().min(1),
  category: timelineCategorySchema.optional(),
});

export const extractedTimelinePayloadSchema = z.union([
  z.array(extractedTimelineEventSchema),
  z.object({ events: z.array(extractedTimelineEventSchema) }),
]);

export type TimelineCategoryInput = z.infer<typeof timelineCategorySchema>;
export type CreateTimelineEventInput = z.infer<typeof createTimelineEventBodySchema>;
export type UpdateTimelineEventInput = z.infer<typeof updateTimelineEventBodySchema>;
export type ExtractedTimelineEvent = z.infer<typeof extractedTimelineEventSchema>;
