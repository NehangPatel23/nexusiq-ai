import type { RiskStatus } from "@prisma/client";

import { AuthError } from "@/features/organizations/lib/authorization";
import { requireProjectReportsAccess } from "@/features/reports/lib/authorization";
import { prisma } from "@/lib/db";

const ALLOWED: RiskStatus[] = ["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"];

export async function updateFindingStatus(params: {
  findingId: string;
  userId: string;
  status: RiskStatus;
}) {
  if (!ALLOWED.includes(params.status)) {
    throw new AuthError("FORBIDDEN", "Invalid finding status");
  }

  const finding = await prisma.finding.findUnique({ where: { id: params.findingId } });
  if (!finding) {
    throw new AuthError("NOT_FOUND", "Finding not found");
  }

  await requireProjectReportsAccess(finding.projectId);

  return prisma.finding.update({
    where: { id: params.findingId },
    data: { status: params.status },
    select: {
      id: true,
      status: true,
      title: true,
      projectId: true,
      updatedAt: true,
    },
  });
}
