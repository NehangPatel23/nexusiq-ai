export function exportMarkdownBuffer(content: string): Buffer {
  return Buffer.from(content, "utf-8");
}

export function markdownContentType(): string {
  return "text/markdown; charset=utf-8";
}

export function markdownFileName(title: string, reportId: string): string {
  const safe = title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) || "report";
  return `${safe}-${reportId.slice(0, 8)}.md`;
}
