import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { History } from "lucide-react";

import { HistoryPageClient } from "@/features/history/components/history-page";
import { listOrganizationProjectsForCompare } from "@/features/history/lib/compare";
import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { ProjectTabHeader } from "@/features/projects/components/project-tab-header";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Project History" };

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectHistoryPage({ params }: PageProps) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const project = await getProjectById(projectId);
  if (!project) redirect("/dashboard/projects");

  const organizationId = project.workspace.organizationId;
  try {
    await requireOrgRole(organizationId, DATA_ROOM_VIEW_MIN_ROLE);
  } catch (error) {
    if (error instanceof AuthError) redirect("/dashboard");
    throw error;
  }

  const org = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: { name: true },
  });
  const projects = await listOrganizationProjectsForCompare(organizationId);

  return (
    <div className="space-y-8">
      <ProjectTabHeader
        icon={History}
        title="Project History"
        description={
          <>
            Audit events for {project.name}.{" "}
            <Link
              href="/dashboard/history"
              className="text-primary underline-offset-4 hover:underline"
            >
              Open org-wide History
            </Link>
          </>
        }
      />
      <HistoryPageClient
        organizations={[{ id: organizationId, name: org?.name ?? "Organization" }]}
        initialOrgId={organizationId}
        projectsByOrg={{ [organizationId]: projects }}
        projectFilter={projectId}
      />
    </div>
  );
}
