import { createHash } from "crypto";

import { encode, decode } from "gpt-tokenizer";

export const DEFAULT_CHUNK_SIZE = 512;
export const DEFAULT_CHUNK_OVERLAP = 64;

export type TextChunk = {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  pageNumber?: number;
  sectionTitle?: string;
};

export function countTokens(text: string): number {
  return encode(text).length;
}

export function computeContentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Split text into overlapping token windows (~512 tokens, 64 overlap).
 * Breaks prefer paragraph and sentence boundaries when possible.
 */
export function chunkText(
  text: string,
  options?: { chunkSize?: number; overlap?: number },
): TextChunk[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options?.overlap ?? DEFAULT_CHUNK_OVERLAP;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const tokens = encode(normalized);
  if (tokens.length <= chunkSize) {
    return [{ chunkIndex: 0, content: normalized, tokenCount: tokens.length }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < tokens.length) {
    let end = Math.min(start + chunkSize, tokens.length);
    let sliceTokens = tokens.slice(start, end);
    let content = decode(sliceTokens).trim();

    if (end < tokens.length && content.length > 0) {
      const lastBreak = Math.max(
        content.lastIndexOf("\n\n"),
        content.lastIndexOf(". "),
        content.lastIndexOf("? "),
        content.lastIndexOf("! "),
      );
      if (lastBreak > content.length * 0.5) {
        content = content.slice(0, lastBreak + 1).trim();
        sliceTokens = encode(content);
        end = start + sliceTokens.length;
      }
    }

    if (content) {
      chunks.push({
        chunkIndex,
        content,
        tokenCount: sliceTokens.length,
      });
      chunkIndex++;
    }

    if (end >= tokens.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
