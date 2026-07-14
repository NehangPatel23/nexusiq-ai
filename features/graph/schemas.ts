import { z } from "zod";

export const entityTypeSchema = z.enum([
  "person",
  "organization",
  "location",
  "date",
  "amount",
  "other",
]);

export const extractGraphBodySchema = z.object({
  force: z.boolean().optional(),
  /** Run multiple seed-query batches to cover more chunks. */
  all: z.boolean().optional(),
  seedQuery: z.string().trim().min(1).max(500).optional(),
});

export const createGraphNodeBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: entityTypeSchema.default("other"),
});

export type CreateGraphNodeInput = z.infer<typeof createGraphNodeBodySchema>;

export const updateGraphNodeBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  type: entityTypeSchema.optional(),
});

export type UpdateGraphNodeInput = z.infer<typeof updateGraphNodeBodySchema>;

export const createGraphRelationBodySchema = z.object({
  sourceEntityId: z.string().uuid(),
  targetEntityId: z.string().uuid(),
  relationType: z.string().trim().min(1).max(120),
  confidence: z.number().min(0).max(1).optional().default(0.8),
});

export type CreateGraphRelationInput = z.infer<typeof createGraphRelationBodySchema>;

export const updateGraphRelationBodySchema = z.object({
  relationType: z.string().trim().min(1).max(120).optional(),
  confidence: z.number().min(0).max(1).optional(),
  reverse: z.boolean().optional(),
});

export type UpdateGraphRelationInput = z.infer<typeof updateGraphRelationBodySchema>;

export const extractedEntitySchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(64),
});

export const extractedRelationSchema = z.object({
  source: z.string().trim().min(1).max(200),
  target: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(120).optional(),
  relationType: z.string().trim().min(1).max(120).optional(),
  confidence: z.number().min(0).max(1).optional(),
  sourceChunkId: z.string().min(1),
});

export const extractedGraphPayloadSchema = z.object({
  entities: z.array(extractedEntitySchema).default([]),
  relations: z.array(extractedRelationSchema).default([]),
});

export type ExtractedGraphPayload = z.infer<typeof extractedGraphPayloadSchema>;
