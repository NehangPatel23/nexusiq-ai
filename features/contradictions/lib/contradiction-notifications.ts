import { createNotification } from "@/features/organizations/lib/notifications";
import type { ContradictionView } from "@/features/contradictions/lib/contradictions";
import { prisma } from "@/lib/db";

export async function notifyCriticalContradictions(params: {
  projectId: string;
  userId: string;
  contradictions: ContradictionView[];
}) {
  const critical = params.contradictions.filter((row) => row.severity === "CRITICAL");
  if (critical.length === 0) return;

  const preview = critical[0]?.subject ?? "Critical contradiction";
  const suffix = critical.length > 1 ? ` (+${critical.length - 1} more)` : "";

  await createNotification({
    userId: params.userId,
    type: "RISK_FOUND",
    title: "Critical contradictions found",
    body: `${preview}${suffix}`,
    link: `/dashboard/projects/${params.projectId}/contradictions`,
  }).catch(() => undefined);

  // Also notify other org members on the project's organization (best-effort).
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, deletedAt: null },
    select: { workspace: { select: { organizationId: true } } },
  });
  const orgId = project?.workspace.organizationId;
  if (!orgId) return;

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId, userId: { not: params.userId } },
    select: { userId: true },
    take: 40,
  });

  await Promise.all(
    members.map((member) =>
      createNotification({
        userId: member.userId,
        type: "RISK_FOUND",
        title: "Critical contradictions found",
        body: `${preview}${suffix}`,
        link: `/dashboard/projects/${params.projectId}/contradictions`,
      }).catch(() => undefined),
    ),
  );
}
