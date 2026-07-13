import { notFound, redirect } from "next/navigation";

import { ChatPage as ProjectChatPage } from "@/features/chat/components/chat-page";
import { listChats } from "@/features/chat/lib/chats";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
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

  const chats = await listChats(projectId, session.user.id);
  return <ProjectChatPage projectId={projectId} projectName={project.name} initialChats={chats} />;
}
