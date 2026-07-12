import { prisma } from "@/lib/db";

export async function findDuplicateDocument(params: {
  projectId: string;
  contentHash: string;
  excludeDocumentId: string;
}): Promise<string | null> {
  const match = await prisma.document.findFirst({
    where: {
      projectId: params.projectId,
      contentHash: params.contentHash,
      deletedAt: null,
      id: { not: params.excludeDocumentId },
      status: { in: ["READY", "PROCESSING", "PENDING"] },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  return match?.id ?? null;
}
