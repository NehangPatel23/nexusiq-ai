import { describe, expect, it } from "vitest";

import {
  detectDocumentTransitions,
  snapshotDocuments,
} from "../lib/document-transitions";
import type { DataRoomDocument } from "../lib/types";

function doc(partial: Partial<DataRoomDocument> & Pick<DataRoomDocument, "id" | "status">): DataRoomDocument {
  return {
    id: partial.id,
    projectId: "p1",
    folderId: partial.folderId ?? null,
    name: partial.name ?? "file.txt",
    originalName: partial.name ?? "file.txt",
    mimeType: "text/plain",
    type: "TXT",
    classification: partial.classification ?? null,
    filePath: "path",
    fileSize: 10,
    status: partial.status,
    version: 1,
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    folder: partial.folder ?? null,
    chunkCount: partial.chunkCount ?? 0,
    errorMessage: partial.errorMessage ?? null,
  };
}

describe("document transitions", () => {
  it("detects ready and auto-folder transitions", () => {
    const previous = snapshotDocuments([
      doc({ id: "1", status: "PROCESSING", folderId: null, folder: null }),
    ]);
    const next = [
      doc({
        id: "1",
        status: "READY",
        folderId: "f1",
        folder: { id: "f1", name: "Financials", path: "/Financials" },
        chunkCount: 3,
      }),
    ];

    const transitions = detectDocumentTransitions(previous, next);
    expect(transitions.some((t) => t.type === "ready")).toBe(true);
    expect(transitions.some((t) => t.type === "auto-folder")).toBe(true);
  });
});
