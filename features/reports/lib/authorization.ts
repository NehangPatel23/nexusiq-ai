import type { OrgRole } from "@prisma/client";

import { DATA_ROOM_ADMIN_MIN_ROLE, DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { hasMinRole } from "@/features/organizations/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";

export async function requireProjectReportsAccess(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AuthError("NOT_FOUND", "Project not found");
  }
  const session = await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);
  return { project, session };
}

export async function requireReportAccess(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      project: {
        include: {
          workspace: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!report || report.project.deletedAt) {
    throw new AuthError("NOT_FOUND", "Report not found");
  }

  const session = await requireOrgRole(
    report.project.workspace.organizationId,
    DATA_ROOM_VIEW_MIN_ROLE,
  );

  return { report, session, organizationId: report.project.workspace.organizationId };
}

export function canDeleteReport(params: {
  userId: string;
  reportUserId: string;
  role: OrgRole;
}): boolean {
  if (params.userId === params.reportUserId) return true;
  return hasMinRole(params.role, DATA_ROOM_ADMIN_MIN_ROLE);
}
