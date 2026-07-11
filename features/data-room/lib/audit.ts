import type { DataRoomAuditAction, DataRoomResourceType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type AuditLogInput = {
  projectId: string;
  actorId?: string | null;
  action: DataRoomAuditAction;
  resourceType: DataRoomResourceType;
  resourceId: string;
  resourceName: string;
  metadata?: Record<string, unknown> | null;
};

export async function logDataRoomAudit(input: AuditLogInput) {
  return prisma.dataRoomAuditEvent.create({
    data: {
      projectId: input.projectId,
      actorId: input.actorId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceName: input.resourceName,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function listDataRoomAuditEvents(
  projectId: string,
  options: { limit?: number } = {},
) {
  return prisma.dataRoomAuditEvent.findMany({
    where: { projectId },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 500,
  });
}

export function exportAuditEventsCsv(
  events: Awaited<ReturnType<typeof listDataRoomAuditEvents>>,
): string {
  const headers = [
    "Timestamp",
    "Action",
    "Resource Type",
    "Resource Name",
    "Resource ID",
    "Actor",
    "Actor Email",
    "Details",
  ];

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const rows = events.map((event) => [
    event.createdAt.toISOString(),
    event.action,
    event.resourceType,
    event.resourceName,
    event.resourceId,
    event.actor?.name ?? "System",
    event.actor?.email ?? "",
    event.metadata ? JSON.stringify(event.metadata) : "",
  ]);

  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}
