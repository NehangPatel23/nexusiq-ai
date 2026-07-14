import { z } from "zod";

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"]);

export const createTaskBodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  impact: z.string().trim().max(1000).optional().nullable(),
  findingId: z.string().uuid().optional().nullable(),
  documentId: z.string().uuid().optional().nullable(),
});

export const updateTaskBodySchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(4000).optional().nullable(),
    assigneeId: z.string().uuid().optional().nullable(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: z.string().datetime().optional().nullable(),
    impact: z.string().trim().max(1000).optional().nullable(),
    findingId: z.string().uuid().optional().nullable(),
    documentId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const fromFindingsBodySchema = z.object({
  findingIds: z.array(z.string().uuid()).max(50).optional(),
  includeExecutiveActions: z.boolean().optional(),
});

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
});
