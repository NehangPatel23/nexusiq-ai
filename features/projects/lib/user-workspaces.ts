import { prisma } from "@/lib/db";

export async function listUserWorkspaces(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId,
      organization: { deletedAt: null },
    },
    select: { organizationId: true },
  });

  const organizationIds = memberships.map((membership) => membership.organizationId);

  if (organizationIds.length === 0) {
    return [];
  }

  return prisma.workspace.findMany({
    where: {
      deletedAt: null,
      organizationId: { in: organizationIds },
    },
    select: {
      id: true,
      name: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
  });
}
