/**
 * Sanitize a single folder/file path segment.
 */
export function sanitizePathSegment(name: string): string {
  return name
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.\-()]/g, "")
    .trim()
    .slice(0, 120);
}

/**
 * Build a folder path from parent path + name.
 * Root folders use "/Name"; nested use "/Parent/Child".
 */
export function buildFolderPath(parentPath: string | null | undefined, name: string): string {
  const segment = sanitizePathSegment(name);
  if (!segment) {
    throw new Error("Folder name is required");
  }
  if (!parentPath || parentPath === "/") {
    return `/${segment}`;
  }
  const normalizedParent = parentPath.endsWith("/") ? parentPath.slice(0, -1) : parentPath;
  return `${normalizedParent}/${segment}`;
}

/**
 * Split a relative upload path into folder segments + file name.
 * e.g. "Financials/Q1/report.pdf" → { folders: ["Financials", "Q1"], fileName: "report.pdf" }
 */
export function splitRelativeUploadPath(relativePath: string): {
  folders: string[];
  fileName: string;
} {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) {
    return { folders: [], fileName: "untitled" };
  }
  const fileName = parts[parts.length - 1]!;
  const folders = parts.slice(0, -1).map(sanitizePathSegment).filter(Boolean);
  return { folders, fileName };
}
