import type {
  Invite,
  Notification,
  Organization,
  OrganizationMember,
  PasswordResetToken,
  Project,
  Team,
  TeamMember,
  User,
  Workspace,
} from "@prisma/client";
import type { Prisma, PrismaClient } from "@prisma/client";

export interface AppDataSnapshot {
  users: User[];
  passwordResetTokens: PasswordResetToken[];
  organizations: Organization[];
  organizationMembers: OrganizationMember[];
  teams: Team[];
  teamMembers: TeamMember[];
  workspaces: Workspace[];
  projects: Project[];
  invites: Invite[];
  notifications: Notification[];
}

/** Emails created by e2e Playwright tests and integration tests. */
export function isTestUserEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith("@test.com")) {
    return true;
  }
  if (!normalized.endsWith("@example.com")) {
    return false;
  }
  return (
    normalized.startsWith("auth-integration-") ||
    normalized.startsWith("org-") ||
    normalized.startsWith("invite-first-")
  );
}

export function testUserPrismaFilter(): Prisma.UserWhereInput {
  return {
    OR: [
      { email: { endsWith: "@test.com", mode: "insensitive" } },
      { email: { startsWith: "auth-integration-", mode: "insensitive" } },
      { email: { startsWith: "org-", mode: "insensitive" } },
      { email: { startsWith: "invite-first-", mode: "insensitive" } },
    ],
  };
}

export async function purgeTestUsers(prisma: PrismaClient) {
  const deletedUsers = await prisma.user.deleteMany({
    where: testUserPrismaFilter(),
  });

  const deletedOrganizations = await prisma.organization.deleteMany({
    where: { members: { none: {} } },
  });

  return {
    users: deletedUsers.count,
    organizations: deletedOrganizations.count,
  };
}

/** Drop test fixtures so sync does not copy e2e/integration junk to Supabase. */
export function excludeTestData(data: AppDataSnapshot): AppDataSnapshot {
  const users = data.users.filter((user) => !isTestUserEmail(user.email));
  const userIds = new Set(users.map((user) => user.id));
  const userEmails = new Set(users.map((user) => user.email));

  const organizationMembers = data.organizationMembers.filter((member) =>
    userIds.has(member.userId),
  );
  const organizationIds = new Set(organizationMembers.map((member) => member.organizationId));
  const workspaces = data.workspaces.filter((workspace) => organizationIds.has(workspace.organizationId));
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));

  return {
    users,
    passwordResetTokens: data.passwordResetTokens.filter((token) => userEmails.has(token.email)),
    organizations: data.organizations.filter((org) => organizationIds.has(org.id)),
    organizationMembers,
    teams: data.teams.filter((team) => organizationIds.has(team.organizationId)),
    teamMembers: data.teamMembers.filter((member) => userIds.has(member.userId)),
    workspaces,
    projects: data.projects.filter((project) => workspaceIds.has(project.workspaceId)),
    invites: data.invites.filter((invite) => organizationIds.has(invite.organizationId)),
    notifications: data.notifications.filter((notification) => userIds.has(notification.userId)),
  };
}

export function countSnapshot(data: AppDataSnapshot) {
  return {
    users: data.users.length,
    passwordResetTokens: data.passwordResetTokens.length,
    organizations: data.organizations.length,
    organizationMembers: data.organizationMembers.length,
    teams: data.teams.length,
    teamMembers: data.teamMembers.length,
    workspaces: data.workspaces.length,
    projects: data.projects.length,
    invites: data.invites.length,
    notifications: data.notifications.length,
  };
}
