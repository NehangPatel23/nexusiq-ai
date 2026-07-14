import { notFound, redirect } from "next/navigation";

import { ActionsPageClient } from "@/features/actions/components/actions-page";
import { listTasks } from "@/features/actions/lib/tasks";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { listOrganizationMembers } from "@/features/organizations/lib/organizations";
import { getProjectById } from "@/features/projects/lib/projects";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ActionsPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const membership = await getOrganizationMembership(
    project.workspace.organizationId,
    session.user.id,
  );
  if (!membership) redirect("/dashboard/projects");

  const [tasks, members] = await Promise.all([
    listTasks(projectId),
    listOrganizationMembers(project.workspace.organizationId),
  ]);

  return (
    <ActionsPageClient
      projectId={projectId}
      projectName={project.name}
      initialTasks={JSON.parse(JSON.stringify(tasks))}
      initialMembers={JSON.parse(
        JSON.stringify(
          members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
            role: m.role,
          })),
        ),
      )}
    />
  );
}
