import { prisma } from "@/lib/db";

/** Reset document state before reprocessing — no heavy extractors imported. */
export async function resetDocumentForReprocess(documentId: string): Promise<void> {
  await prisma.documentChunk.deleteMany({ where: { documentId } });
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "PENDING",
      errorMessage: null,
      processedAt: null,
      classification: null,
      duplicateOfId: null,
    },
  });
}
