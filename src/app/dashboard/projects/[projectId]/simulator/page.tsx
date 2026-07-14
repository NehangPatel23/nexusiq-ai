import { notFound, redirect } from "next/navigation";

import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { SimulatorPageClient } from "@/features/simulator/components/simulator-page";
import {
  getSimulationPrerequisites,
  listSimulationRuns,
} from "@/lib/ai/simulator";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SimulatorPage({ params }: PageProps) {
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

  const [simulations, prerequisites] = await Promise.all([
    listSimulationRuns(projectId),
    getSimulationPrerequisites(projectId),
  ]);

  return (
    <SimulatorPageClient
      projectId={projectId}
      projectName={project.name}
      initialSimulations={JSON.parse(JSON.stringify(simulations))}
      initialPrerequisites={JSON.parse(JSON.stringify(prerequisites))}
    />
  );
}
