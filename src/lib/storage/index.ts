import { createLocalStorageAdapter } from "./local";
import { createSupabaseStorageAdapter, isSupabaseStorageConfigured } from "./supabase";
import type { StorageAdapter } from "./types";

export type { StorageAdapter } from "./types";
export { isSupabaseStorageConfigured } from "./supabase";

let cachedAdapter: StorageAdapter | null = null;

/**
 * Local filesystem when STORAGE_PATH is used (dev).
 * Supabase Storage when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 */
export function getStorage(): StorageAdapter {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  cachedAdapter = isSupabaseStorageConfigured()
    ? createSupabaseStorageAdapter()
    : createLocalStorageAdapter();

  return cachedAdapter;
}

/** Test helper — reset singleton between tests. */
export function resetStorageAdapter() {
  cachedAdapter = null;
}

export function buildDocumentStorageKey(params: {
  organizationId: string;
  projectId: string;
  documentId: string;
  version: number;
  fileName: string;
}) {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return [
    "organizations",
    params.organizationId,
    "projects",
    params.projectId,
    "documents",
    params.documentId,
    `v${params.version}`,
    safeName,
  ].join("/");
}

export function buildReportStorageKey(params: {
  organizationId: string;
  projectId: string;
  reportId: string;
  format: string;
  fileName: string;
}) {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeFormat = params.format.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  return [
    "organizations",
    params.organizationId,
    "projects",
    params.projectId,
    "reports",
    params.reportId,
    safeFormat,
    safeName,
  ].join("/");
}
