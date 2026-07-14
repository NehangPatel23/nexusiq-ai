import type { FindingSeverity, RiskStatus } from "@prisma/client";

import { AuthError } from "@/features/organizations/lib/authorization";
import { requireProjectReportsAccess } from "@/features/reports/lib/authorization";
import { prisma } from "@/lib/db";

const ALLOWED_STATUS: RiskStatus[] = ["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"];
const ALLOWED_SEVERITY: FindingSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export async function updateFindingStatus(params: {
  findingId: string;
  userId: string;
  status?: RiskStatus;
  severity?: FindingSeverity;
}) {
  if (params.status === undefined && params.severity === undefined) {
    throw new AuthError("FORBIDDEN", "Provide status and/or severity");
  }
  if (params.status !== undefined && !ALLOWED_STATUS.includes(params.status)) {
    throw new AuthError("FORBIDDEN", "Invalid finding status");
  }
  if (params.severity !== undefined && !ALLOWED_SEVERITY.includes(params.severity)) {
    throw new AuthError("FORBIDDEN", "Invalid finding severity");
  }

  const finding = await prisma.finding.findUnique({ where: { id: params.findingId } });
  if (!finding) {
    throw new AuthError("NOT_FOUND", "Finding not found");
  }

  await requireProjectReportsAccess(finding.projectId);

  return prisma.finding.update({
    where: { id: params.findingId },
    data: {
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(params.severity !== undefined ? { severity: params.severity } : {}),
    },
    select: {
      id: true,
      status: true,
      severity: true,
      title: true,
      projectId: true,
      updatedAt: true,
    },
  });
}
