import type { DocumentType } from "@prisma/client";

/** Max upload size: 50MB */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_TO_DOCUMENT_TYPE: Record<string, DocumentType> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "text/csv": "CSV",
  "application/csv": "CSV",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/plain": "TXT",
  "text/markdown": "TXT",
  "image/png": "IMAGE",
  "image/jpeg": "IMAGE",
};

const EXTENSION_TO_MIME: Record<string, AllowedMimeType> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function mimeTypeToDocumentType(mimeType: string): DocumentType {
  return MIME_TO_DOCUMENT_TYPE[mimeType] ?? "OTHER";
}

export function extensionFromFileName(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return "";
  return fileName.slice(idx).toLowerCase();
}

export function resolveMimeType(fileName: string, providedMime?: string | null): string | null {
  if (providedMime && isAllowedMimeType(providedMime)) {
    return providedMime;
  }
  const ext = extensionFromFileName(fileName);
  return EXTENSION_TO_MIME[ext] ?? null;
}

export function validateUploadFile(params: {
  fileName: string;
  mimeType?: string | null;
  size: number;
}): { ok: true; mimeType: string; type: DocumentType } | { ok: false; message: string } {
  if (params.size <= 0) {
    return { ok: false, message: "File is empty" };
  }
  if (params.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "File exceeds the 50MB limit" };
  }

  const mimeType = resolveMimeType(params.fileName, params.mimeType);
  if (!mimeType) {
    return {
      ok: false,
      message: "Unsupported file type. Allowed: PDF, DOCX, XLSX, CSV, PPTX, TXT, MD, PNG, JPG",
    };
  }

  return {
    ok: true,
    mimeType,
    type: mimeTypeToDocumentType(mimeType),
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
