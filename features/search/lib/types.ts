import type { DocumentClassification, DocumentType } from "@prisma/client";

export type SearchMode = "hybrid" | "semantic" | "keyword";

export type SearchFilters = {
  type?: DocumentType;
  classification?: DocumentClassification;
  folderId?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
};

export type SearchResultItem = {
  chunkId: string;
  documentId: string;
  documentName: string;
  documentType: DocumentType;
  classification: DocumentClassification | null;
  folderId: string | null;
  content: string;
  snippet: string;
  score: number;
  pageNumber: number | null;
  sectionTitle: string | null;
  mode: SearchMode;
};

export type SearchMeta = {
  tookMs: number;
  mode: SearchMode;
  ollamaUsed: boolean;
  /** Unique documents after per-document deduplication. */
  uniqueDocuments: number;
  fallback?: boolean;
  fallbackMessage?: string;
};

export type SearchResponse = {
  results: SearchResultItem[];
  meta: SearchMeta;
};

export type SavedSearchItem = {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  query: string;
  filters: SearchFilters;
  mode: SearchMode;
  createdAt: string;
};
