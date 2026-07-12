/** Read plain text from TXT, CSV, MD, and similar formats. */
export async function extractPlainText(buffer: Buffer, mimeType: string): Promise<string> {
  const text = buffer.toString("utf8").replace(/\u0000/g, "").trim();
  if (text) return text;

  if (mimeType.includes("csv") || mimeType.startsWith("text/")) {
    return buffer.toString("latin1").trim();
  }

  return "";
}

export function estimatePageCount(text: string, charsPerPage = 3000): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / charsPerPage));
}
