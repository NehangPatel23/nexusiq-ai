import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";

import { getChatForAuthorization } from "./chats";

export async function requireProjectChatAccess(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AuthError("NOT_FOUND", "Project not found");
  }
  const session = await requireOrgRole(
    project.workspace.organizationId,
    DATA_ROOM_VIEW_MIN_ROLE,
  );
  return { project, session };
}

export async function requireChatOwner(chatId: string) {
  const chat = await getChatForAuthorization(chatId);
  if (!chat) {
    throw new AuthError("NOT_FOUND", "Chat not found");
  }
  const session = await requireOrgRole(
    chat.project.workspace.organizationId,
    DATA_ROOM_VIEW_MIN_ROLE,
  );
  if (chat.userId !== session.userId) {
    throw new AuthError("FORBIDDEN", "You do not have access to this chat");
  }
  return { chat, session };
}
