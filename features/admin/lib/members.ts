import { prisma } from "@/lib/db";

export type AdminMemberRow = {
  id: string;
  userId: string;
  role: string;
  joinedAt: Date;
  name: string | null;
  email: string;
};

/** Org members excluding soft-deleted users. */
export async function listAdminMembers(organizationId: string): Promise<AdminMemberRow[]> {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      user: { deletedAt: null },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    role: m.role,
    joinedAt: m.createdAt,
    name: m.user.name,
    email: m.user.email,
  }));
}
