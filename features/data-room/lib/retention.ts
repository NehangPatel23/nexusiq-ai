import { permanentlyDeleteDocument, listDeletedDocuments } from "./documents";
import { listDeletedFolders, permanentlyDeleteFolder } from "./folders";

/** Default retention for soft-deleted items before auto-purge (days). */
export const DEFAULT_DELETED_RETENTION_DAYS = 30;

export function getDeletedRetentionDays(): number {
  const raw = process.env.DATA_ROOM_DELETED_RETENTION_DAYS;
  if (!raw) return DEFAULT_DELETED_RETENTION_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DELETED_RETENTION_DAYS;
  return parsed;
}

export type PurgeResult = {
  documentsPurged: number;
  foldersPurged: number;
  retentionDays: number;
};

/**
 * Permanently removes soft-deleted documents and folders older than the retention window.
 */
export async function purgeExpiredDeletedItems(projectId: string): Promise<PurgeResult> {
  const retentionDays = getDeletedRetentionDays();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  let documentsPurged = 0;
  let foldersPurged = 0;

  const expiredDocs = (await listDeletedDocuments(projectId)).filter(
    (doc) => doc.deletedAt && doc.deletedAt < cutoff,
  );

  for (const doc of expiredDocs) {
    const result = await permanentlyDeleteDocument(doc.id);
    if ("deleted" in result && result.deleted) {
      documentsPurged++;
    }
  }

  const expiredFolders = (await listDeletedFolders(projectId)).filter(
    (folder) => folder.deletedAt && folder.deletedAt < cutoff,
  );

  // Purge deepest folders first (longest path)
  const sorted = [...expiredFolders].sort((a, b) => b.path.length - a.path.length);
  for (const folder of sorted) {
    const stillExists = (await listDeletedFolders(projectId)).some((f) => f.id === folder.id);
    if (!stillExists) continue;
    const result = await permanentlyDeleteFolder(folder.id);
    if ("deleted" in result && result.deleted) {
      foldersPurged++;
    }
  }

  return { documentsPurged, foldersPurged, retentionDays };
}
