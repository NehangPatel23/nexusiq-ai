import { extensionFromFileName } from "./mime";
import type { DataRoomDocument } from "./types";

export type PreviewMode =
  | "pdf"
  | "image"
  | "text"
  | "csv"
  | "markdown"
  | "docx"
  | "xlsx"
  | "pptx"
  | "unsupported";

export function getPreviewMode(document: DataRoomDocument): PreviewMode {
  if (document.type === "PDF" || document.mimeType === "application/pdf") {
    return "pdf";
  }
  if (document.type === "IMAGE" || document.mimeType.startsWith("image/")) {
    return "image";
  }
  if (document.type === "CSV" || document.mimeType.includes("csv")) {
    return "csv";
  }
  if (
    document.type === "DOCX" ||
    document.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (
    document.type === "XLSX" ||
    document.mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "xlsx";
  }
  if (
    document.type === "PPTX" ||
    document.mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return "pptx";
  }

  const ext = extensionFromFileName(document.name);
  const lowerName = document.name.toLowerCase();

  if (
    document.type === "MD" ||
    document.mimeType === "text/markdown" ||
    [".md", ".markdown", ".mdown"].includes(ext) ||
    lowerName.includes("readme") ||
    lowerName.endsWith(".md")
  ) {
    return "markdown";
  }

  if (
    document.type === "TXT" ||
    document.mimeType === "text/plain" ||
    [".txt", ".log", ".json", ".xml", ".yaml", ".yml"].includes(ext)
  ) {
    return "text";
  }

  return "unsupported";
}

export function canInlinePreview(document: DataRoomDocument): boolean {
  return getPreviewMode(document) !== "unsupported";
}

export function parseCsvPreview(text: string, maxRows = 150) {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { headers: [] as string[], rows: [] as string[][] };
  }

  const parseRow = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i]!;
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseRow(lines[0]!);
  const rows = lines.slice(1, maxRows + 1).map(parseRow);
  const truncated = lines.length > maxRows + 1;

  return { headers, rows, truncated };
}

export function formatPreviewLabel(mode: PreviewMode): string {
  switch (mode) {
    case "pdf":
      return "PDF";
    case "image":
      return "Image";
    case "csv":
      return "Spreadsheet";
    case "markdown":
      return "Markdown";
    case "docx":
      return "Word";
    case "xlsx":
      return "Excel";
    case "pptx":
      return "Presentation";
    case "text":
      return "Text";
    default:
      return "Document";
  }
}
