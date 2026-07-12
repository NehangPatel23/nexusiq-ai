import { prisma } from "@/lib/db";

import { processDocument } from "./pipeline";

export async function claimPendingDocuments(limit: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE documents
    SET status = 'PROCESSING', updated_at = NOW()
    WHERE id IN (
      SELECT id FROM documents
      WHERE status = 'PENDING' AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `;
  return rows.map((row) => row.id);
}

export async function processClaimedDocument(documentId: string) {
  return processDocument(documentId);
}
