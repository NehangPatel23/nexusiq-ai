import type { DocumentClassification, DocumentStatus, DocumentType } from "@prisma/client";

import { getDocumentTypeLabel } from "./mime";
import type { DataRoomDocument } from "./types";

export type DocumentSortKey = "name" | "type" | "status" | "version" | "size" | "uploaded";
export type SortDirection = "asc" | "desc";

export type DocumentFilters = {
  query: string;
  status: DocumentStatus | "all";
  type: DocumentType | "all";
  classification: DocumentClassification | "all" | "unclassified";
  tag: string;
};

export function filterDocuments(
  documents: DataRoomDocument[],
  filters: DocumentFilters,
): DataRoomDocument[] {
  const q = filters.query.trim().toLowerCase();

  return documents.filter((doc) => {
    if (filters.status !== "all" && doc.status !== filters.status) return false;
    if (filters.type !== "all") {
      if (filters.type === "MD") {
        if (getDocumentTypeLabel(doc) !== "MD") return false;
      } else if (
        doc.type !== filters.type ||
        (filters.type === "TXT" && getDocumentTypeLabel(doc) === "MD")
      ) {
        return false;
      }
    }
    if (filters.classification === "unclassified" && doc.classification) return false;
    if (
      filters.classification !== "all" &&
      filters.classification !== "unclassified" &&
      doc.classification !== filters.classification
    ) {
      return false;
    }
    if (filters.tag && !doc.tags.includes(filters.tag)) return false;
    if (!q) return true;

    return (
      doc.name.toLowerCase().includes(q) ||
      doc.type.toLowerCase().includes(q) ||
      (doc.classification?.toLowerCase().includes(q) ?? false) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
}

export function sortDocuments(
  documents: DataRoomDocument[],
  sortKey: DocumentSortKey,
  direction: SortDirection,
): DataRoomDocument[] {
  const sorted = [...documents].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "type":
        cmp = a.type.localeCompare(b.type);
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "version":
        cmp = a.version - b.version;
        break;
      case "size":
        cmp = a.fileSize - b.fileSize;
        break;
      case "uploaded":
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        cmp = 0;
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function buildDuplicateMap(documents: DataRoomDocument[]) {
  const byHash = new Map<string, DataRoomDocument[]>();
  for (const doc of documents) {
    const hash = doc.contentHash;
    if (!hash) continue;
    const list = byHash.get(hash) ?? [];
    list.push(doc);
    byHash.set(hash, list);
  }

  const duplicateOf = new Map<string, { id: string; name: string }>();
  for (const group of byHash.values()) {
    if (group.length < 2) continue;
    const primary = group[0]!;
    for (let i = 1; i < group.length; i++) {
      duplicateOf.set(group[i]!.id, { id: primary.id, name: primary.name });
    }
  }
  return duplicateOf;
}

export function collectDocumentTags(documents: DataRoomDocument[]): string[] {
  const tags = new Set<string>();
  for (const doc of documents) {
    for (const tag of doc.tags) tags.add(tag);
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

export function exportDocumentsCsv(documents: DataRoomDocument[]): string {
  const headers = ["Name", "Type", "Classification", "Status", "Version", "Size", "Folder", "Tags", "Uploaded"];
  const rows = documents.map((doc) => [
    doc.name,
    getDocumentTypeLabel(doc),
    doc.classification ?? "",
    doc.status,
    String(doc.version),
    String(doc.fileSize),
    doc.folder?.path ?? "",
    doc.tags.join("; "),
    doc.createdAt,
  ]);

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}
