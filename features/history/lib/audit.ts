import type { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type LogAuditInput = {
  organizationId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

/**
 * Immutable org-scoped audit entry. Never update or delete AuditLog rows.
 * Failures are swallowed so audit never blocks the primary operation.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] logAudit failed", error);
  }
}

/**
 * Best-effort audit when organizationId may be resolved asynchronously.
 * Prefer `logAudit` when the org id is already known.
 */
export async function logAuditForProject(
  projectId: string,
  input: Omit<LogAuditInput, "organizationId">,
): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspace: { select: { organizationId: true } } },
    });
    const organizationId = project?.workspace.organizationId;
    if (!organizationId) return;
    await logAudit({ ...input, organizationId });
  } catch (error) {
    console.error("[audit] logAuditForProject failed", error);
  }
}
