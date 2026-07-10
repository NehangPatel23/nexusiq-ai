import { prisma } from "@/lib/db";

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
  recentReports: [];
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
  const [projectCount, projects, notifications, orgList, workspaces] = await Promise.all([
    countUserProjects(userId),
    listUserProjects(userId),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    listUserOrganizations(userId),
    listUserWorkspaces(userId),
  ]);

  const primaryOrg = orgList[0] ?? null;

  return {
    stats: {
      projectCount,
      documentsProcessed: 0,
      openRisks: 0,
      pendingTasks: 0,
    },
    riskOverview: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    recentActivity: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    })),
    recentReports: [],
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
