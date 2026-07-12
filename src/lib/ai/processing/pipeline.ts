import { randomUUID } from "crypto";

import type { DocumentClassification } from "@prisma/client";

import { listFolders } from "@/features/data-room/lib/folders";
import { logDataRoomAudit } from "@/features/data-room/lib/audit";
import { createNotification } from "@/features/organizations/lib/notifications";
import { prisma } from "@/lib/db";
import { getStorage, type StorageAdapter } from "@/lib/storage";
import { formatVectorLiteral, embedTexts } from "../embeddings";
import { getOllamaClient, type OllamaClient } from "../ollama-client";
import { chunkText, computeContentHash } from "./chunking";
import { classifyDocument } from "./classify";
import { findDuplicateDocument } from "./duplicates";
import { extractDocumentText } from "./extractors";
import { extractEntitiesAndRelations, persistEntitiesAndRelations } from "./ner";

export { resetDocumentForReprocess } from "./reprocess";

export type ProcessingResult =
  | { ok: true; documentId: string; chunkCount: number }
  | { ok: false; documentId: string; error: string };

export type ProcessingDeps = {
  storage?: StorageAdapter;
  ollama?: OllamaClient;
};

const CLASSIFICATION_FOLDER_HINTS: Record<DocumentClassification, string[]> = {
  FINANCIAL: ["financial", "finance", "accounting"],
  LEGAL: ["legal", "contracts", "agreements"],
  TAX: ["tax", "taxes"],
  HR: ["hr", "human resources", "people"],
  OPERATIONAL: ["operations", "operational"],
  COMPLIANCE: ["compliance", "regulatory"],
  CONTRACT: ["contracts", "agreements", "legal"],
  CORRESPONDENCE: ["correspondence", "communications", "email"],
  OTHER: [],
};

async function storeChunks(
  documentId: string,
  chunks: ReturnType<typeof chunkText>,
  embeddings: number[][],
): Promise<Map<number, string>> {
  const chunkIdByIndex = new Map<number, string>();

  await prisma.documentChunk.deleteMany({ where: { documentId } });

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const embedding = embeddings[i];
    const id = randomUUID();
    chunkIdByIndex.set(chunk.chunkIndex, id);

    if (embedding && embedding.length > 0) {
      const vectorLiteral = formatVectorLiteral(embedding);
      await prisma.$executeRaw`
        INSERT INTO document_chunks (
          id, document_id, chunk_index, content, token_count,
          embedding, search_vector, page_number, section_title, created_at
        ) VALUES (
          ${id},
          ${documentId},
          ${chunk.chunkIndex},
          ${chunk.content},
          ${chunk.tokenCount},
          ${vectorLiteral}::vector,
          to_tsvector('english', ${chunk.content}),
          ${chunk.pageNumber ?? null},
          ${chunk.sectionTitle ?? null},
          NOW()
        )
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO document_chunks (
          id, document_id, chunk_index, content, token_count,
          search_vector, page_number, section_title, created_at
        ) VALUES (
          ${id},
          ${documentId},
          ${chunk.chunkIndex},
          ${chunk.content},
          ${chunk.tokenCount},
          to_tsvector('english', ${chunk.content}),
          ${chunk.pageNumber ?? null},
          ${chunk.sectionTitle ?? null},
          NOW()
        )
      `;
    }
  }

  return chunkIdByIndex;
}

async function suggestFolderId(
  projectId: string,
  classification: DocumentClassification,
  currentFolderId: string | null,
): Promise<string | null> {
  if (currentFolderId) return null;

  const hints = CLASSIFICATION_FOLDER_HINTS[classification];
  if (hints.length === 0) return null;

  const folders = await listFolders(projectId);
  const match = folders.find((folder) => {
    const name = folder.name.toLowerCase();
    const path = folder.path.toLowerCase();
    return hints.some((hint) => name.includes(hint) || path.includes(hint));
  });

  return match?.id ?? null;
}

export async function processDocument(
  documentId: string,
  deps: ProcessingDeps = {},
): Promise<ProcessingResult> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
  });

  if (!document) {
    return { ok: false, documentId, error: "Document not found" };
  }

  const storage = deps.storage ?? getStorage();
  const ollama = deps.ollama ?? getOllamaClient();

  try {
    const buffer = await storage.getObject(document.filePath);
    const contentHash = computeContentHash(buffer);
    const duplicateOfId = await findDuplicateDocument({
      projectId: document.projectId,
      contentHash,
      excludeDocumentId: document.id,
    });

    const extracted = await extractDocumentText({
      buffer,
      mimeType: document.mimeType,
      type: document.type,
    });

    if (!extracted.text.trim()) {
      throw new Error("No extractable text found in document");
    }

    const classification = await classifyDocument(extracted.text, ollama);
    const chunks = chunkText(extracted.text);
    if (chunks.length === 0) {
      throw new Error("Document produced no chunks");
    }

    let embeddings: number[][] = [];
    try {
      embeddings = await embedTexts(
        chunks.map((c) => c.content),
        ollama,
      );
    } catch (embedError) {
      const message =
        embedError instanceof Error ? embedError.message : "Embedding failed";
      throw new Error(
        message.includes("fetch") || message.includes("ECONNREFUSED")
          ? "Ollama is unreachable — start Ollama locally or configure OLLAMA_BASE_URL"
          : message,
      );
    }

    const chunkIds = await storeChunks(document.id, chunks, embeddings);

    const ner = await extractEntitiesAndRelations(extracted.text, ollama);
    const firstChunkId = chunkIds.get(0);
    await persistEntitiesAndRelations({
      projectId: document.projectId,
      sourceChunkId: firstChunkId,
      ner,
    });

    const suggestedFolderId = await suggestFolderId(
      document.projectId,
      classification,
      document.folderId,
    );

    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "READY",
        classification,
        contentHash,
        duplicateOfId,
        pageCount: extracted.pageCount || null,
        processedAt: new Date(),
        errorMessage: null,
        ...(suggestedFolderId ? { folderId: suggestedFolderId } : {}),
      },
    });

    const latestVersion = await prisma.documentVersion.findFirst({
      where: { documentId: document.id },
      orderBy: { version: "desc" },
      select: { uploadedById: true },
    });

    if (latestVersion?.uploadedById) {
      await createNotification({
        userId: latestVersion.uploadedById,
        type: "PROCESSING_COMPLETE",
        title: "Document ready",
        body: `${document.name} finished processing with ${chunks.length} chunk${chunks.length === 1 ? "" : "s"}.`,
        link: `/dashboard/projects/${document.projectId}/data-room?doc=${document.id}`,
      }).catch(() => undefined);
    }

    await logDataRoomAudit({
      projectId: document.projectId,
      actorId: latestVersion?.uploadedById ?? null,
      action: "REPROCESSED",
      resourceType: "DOCUMENT",
      resourceId: document.id,
      resourceName: document.name,
      metadata: {
        event: "processing_completed",
        chunkCount: chunks.length,
        classification,
        autoFolderId: suggestedFolderId,
      },
    }).catch(() => undefined);

    return { ok: true, documentId: document.id, chunkCount: chunks.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: message.slice(0, 2000),
        processedAt: new Date(),
      },
    });

    const failedDoc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, name: true, projectId: true },
    });
    if (failedDoc) {
      await logDataRoomAudit({
        projectId: failedDoc.projectId,
        action: "REPROCESSED",
        resourceType: "DOCUMENT",
        resourceId: failedDoc.id,
        resourceName: failedDoc.name,
        metadata: { event: "processing_failed", error: message.slice(0, 500) },
      }).catch(() => undefined);
    }

    return { ok: false, documentId, error: message };
  }
}

export async function markDocumentProcessing(documentId: string): Promise<boolean> {
  const result = await prisma.document.updateMany({
    where: { id: documentId, status: "PENDING", deletedAt: null },
    data: { status: "PROCESSING" },
  });
  return result.count === 1;
}

