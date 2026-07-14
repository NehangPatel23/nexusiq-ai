import type { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type ListAuditLogsOptions = {
  action?: AuditAction;
  userId?: string;
  entityId?: string;
  /** Match metadata.projectId or entityId for project-scoped history. */
  projectId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export async function listAuditLogs(organizationId: string, options: ListAuditLogsOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));
  const skip = (page - 1) * pageSize;

  const where: Prisma.AuditLogWhereInput = {
    organizationId,
    ...(options.action ? { action: options.action } : {}),
    ...(options.userId ? { userId: options.userId } : {}),
    ...(options.entityId && !options.projectId ? { entityId: options.entityId } : {}),
    ...(options.projectId
      ? {
          OR: [
            { entityId: options.projectId },
            { metadata: { path: ["projectId"], equals: options.projectId } },
          ],
        }
      : {}),
    ...((options.from || options.to) && {
      createdAt: {
        ...(options.from ? { gte: options.from } : {}),
        ...(options.to ? { lte: options.to } : {}),
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
