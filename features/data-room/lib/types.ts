import type { DocumentStatus, DocumentType } from "@prisma/client";

export type DataRoomFolder = {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};

export type DataRoomFolderNode = DataRoomFolder & {
  children: DataRoomFolderNode[];
};

export type DataRoomDocument = {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  originalName: string;
  mimeType: string;
  type: DocumentType;
  classification: string | null;
  filePath: string;
  fileSize: number;
  status: DocumentStatus;
  version: number;
  tags: string[];
  contentHash?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  folder: { id: string; name: string; path: string } | null;
};

export type UploadProgressItem = {
  id: string;
  fileName: string;
  relativePath?: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error" | "cancelled";
  error?: string;
  /** Stored for retry — not serialized */
  file?: File;
};
