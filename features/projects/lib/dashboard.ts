import { prisma } from "@/lib/db";

import { listRecentAgentRunActivity } from "@/features/intelligence/lib/agent-run-activity";
import {
  countOpenFindingsBySeverityForUser,
  countOpenFindingsForUser,
} from "@/features/intelligence/lib/findings-stats";
import { listUserOrganizations } from "@/features/organizations/lib/organizations";
import { listUserWorkspaces } from "@/features/projects/lib/user-workspaces";

import { countUserProjects, listUserProjects } from "./projects";

export interface DashboardActivityItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
}

export interface DashboardData {
  stats: {
    projectCount: number;
    documentsProcessed: number;
    documentsProcessing: number;
    openRisks: number;
    pendingTasks: number;
  };
  riskOverview: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recentActivity: DashboardActivityItem[];
  recentReports: Array<{
    id: string;
    title: string;
    projectId: string;
    projectName: string;
    reportType: string;
    createdAt: string;
  }>;
  upcomingTasks: [];
  recentProjectId: string | null;
  onboarding: {
    organizationCount: number;
    workspaceCount: number;
    projectCount: number;
    needsOrganization: boolean;
    needsWorkspace: boolean;
    needsProject: boolean;
    primaryOrgId: string | null;
    primaryOrgName: string | null;
  };
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [
    projectCount,
    projects,
    notifications,
    orgList,
    workspaces,
    documentsProcessed,
    documentsProcessing,
    openRisks,
    riskOverview,
    agentRunActivity,
    recentReportRows,
  ] = await Promise.all([
    countUserProjects(userId),
    listUserProjects(userId),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    listUserOrganizations(userId),
    listUserWorkspaces(userId),
    prisma.document.count({
      where: {
        deletedAt: null,
        status: "READY",
        project: {
          deletedAt: null,
          workspace: {
            deletedAt: null,
            organization: {
              deletedAt: null,
              members: { some: { userId } },
            },
          },
        },
      },
    }),
    prisma.document.count({
      where: {
        deletedAt: null,
        status: { in: ["PENDING", "PROCESSING"] },
        project: {
          deletedAt: null,
          workspace: {
            deletedAt: null,
            organization: {
              deletedAt: null,
              members: { some: { userId } },
            },
          },
        },
      },
    }),
    countOpenFindingsForUser(userId),
    countOpenFindingsBySeverityForUser(userId),
    listRecentAgentRunActivity(userId, 10),
    prisma.report.findMany({
      where: {
        project: {
          deletedAt: null,
          workspace: {
            deletedAt: null,
            organization: {
              deletedAt: null,
              members: { some: { userId } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        projectId: true,
        reportType: true,
        createdAt: true,
        project: { select: { name: true } },
      },
    }),
  ]);

  const primaryOrg = orgList[0] ?? null;

  const notificationActivity: DashboardActivityItem[] = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    createdAt: notification.createdAt.toISOString(),
  }));

  const recentActivity = [...notificationActivity, ...agentRunActivity]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 10);

  return {
    stats: {
      projectCount,
      documentsProcessed,
      documentsProcessing,
      openRisks,
      pendingTasks: 0,
    },
    riskOverview,
    recentActivity,
    recentReports: recentReportRows.map((report) => ({
      id: report.id,
      title: report.title,
      projectId: report.projectId,
      projectName: report.project.name,
      reportType: report.reportType,
      createdAt: report.createdAt.toISOString(),
    })),
    upcomingTasks: [],
    recentProjectId: projects[0]?.id ?? null,
    onboarding: {
      organizationCount: orgList.length,
      workspaceCount: workspaces.length,
      projectCount,
      needsOrganization: orgList.length === 0,
      needsWorkspace: orgList.length > 0 && workspaces.length === 0,
      needsProject: workspaces.length > 0 && projectCount === 0,
      primaryOrgId: primaryOrg?.id ?? null,
      primaryOrgName: primaryOrg?.name ?? null,
    },
  };
}
