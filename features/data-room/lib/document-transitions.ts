import type { DocumentStatus } from "@prisma/client";

import type { DataRoomDocument } from "./types";

export type DocumentSnapshot = {
  status: DocumentStatus;
  folderId: string | null;
  chunkCount: number;
};

export type DocumentTransition =
  | { type: "ready"; doc: DataRoomDocument }
  | { type: "failed"; doc: DataRoomDocument }
  | { type: "auto-folder"; doc: DataRoomDocument; folderPath: string };

export function snapshotDocuments(documents: DataRoomDocument[]): Map<string, DocumentSnapshot> {
  return new Map(
    documents.map((doc) => [
      doc.id,
      {
        status: doc.status,
        folderId: doc.folderId,
        chunkCount: doc.chunkCount ?? 0,
      },
    ]),
  );
}

export function detectDocumentTransitions(
  previous: Map<string, DocumentSnapshot>,
  documents: DataRoomDocument[],
): DocumentTransition[] {
  const transitions: DocumentTransition[] = [];

  for (const doc of documents) {
    const before = previous.get(doc.id);
    if (!before) continue;

    if (before.status !== "READY" && doc.status === "READY") {
      transitions.push({ type: "ready", doc });
    }

    if (before.status !== "FAILED" && doc.status === "FAILED") {
      transitions.push({ type: "failed", doc });
    }

    if (
      doc.status === "READY" &&
      before.folderId !== doc.folderId &&
      doc.folder?.path &&
      before.status !== "READY"
    ) {
      transitions.push({ type: "auto-folder", doc, folderPath: doc.folder.path });
    }
  }

  return transitions;
}
