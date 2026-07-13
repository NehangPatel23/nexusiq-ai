import type { SearchResultItem } from "@/features/search/lib/types";

export type ChatCitation = {
  documentId: string;
  chunkId: string;
  documentName: string;
  excerpt: string;
};

const DOC_CITATION_PATTERN = /\[doc:([^:\]\s]+):chunk:([^\]\s]+)\]/g;
const SOURCE_CITATION_PATTERN = /(?:\(|\[)?(?:Source|SOURCE)\s*(\d+)(?:\)|\]|\.|,|;|:)?/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerptFromChunk(content: string): string {
  return content.length > 280 ? `${content.slice(0, 280)}…` : content;
}

const CITATION_STOP_WORDS = new Set([
  "about",
  "after",
  "agreement",
  "also",
  "been",
  "from",
  "have",
  "into",
  "more",
  "must",
  "only",
  "shall",
  "that",
  "their",
  "there",
  "these",
  "this",
  "upon",
  "were",
  "which",
  "with",
  "within",
  "would",
]);

function normalizeAlias(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function registerAlias(aliases: Map<string, string>, value: string | null | undefined) {
  if (!value) return;
  const trimmed = normalizeAlias(value);
  if (trimmed.length < 5) return;
  const key = trimmed.toLowerCase();
  const existing = aliases.get(key);
  if (!existing || trimmed.length > existing.length) {
    aliases.set(key, trimmed);
  }
}

export function chunkCitationAliases(chunk: SearchResultItem): string[] {
  const aliases = new Map<string, string>();

  registerAlias(aliases, chunk.documentName);
  registerAlias(aliases, chunk.sectionTitle);

  const baseName = chunk.documentName.replace(/\.[^.]+$/, "");
  registerAlias(aliases, baseName);
  registerAlias(aliases, baseName.replace(/[-_]+/g, " "));

  for (const match of chunk.content.matchAll(/^\d+\.\s+(.+)$/gm)) {
    const line = match[1]?.trim();
    if (!line) continue;
    registerAlias(aliases, line);
    for (const part of line.split(/[—–]/)) {
      registerAlias(aliases, part);
    }
    for (const part of line.split(/\s[-–]\s/)) {
      registerAlias(aliases, part);
    }
  }

  for (const match of chunk.content.matchAll(/^([A-Z][A-Z0-9\s/&,'().-]{7,})$/gm)) {
    registerAlias(aliases, match[1]);
  }

  for (const match of chunk.content.matchAll(
    /\b([A-Z][a-z]+(?:\s+[A-Za-z][a-z]+){0,6}\s+(?:Agreement|MSA|Contract|Lease|Summary|Excerpt))\b/g,
  )) {
    registerAlias(aliases, match[1]);
  }

  for (const match of chunk.content.matchAll(
    /\b([a-z]+(?:-[a-z]+){1,4})\b/gi,
  )) {
    registerAlias(aliases, match[1]);
  }

  return Array.from(aliases.values()).sort((left, right) => right.length - left.length);
}

function findMatchingAlias(content: string, aliases: string[]): string | null {
  const contentLower = content.toLowerCase();
  for (const alias of aliases) {
    if (contentLower.includes(alias.toLowerCase())) {
      return alias;
    }
  }
  return null;
}

function tokenizeSignificant(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/\b[a-z][a-z0-9-]{3,}\b/g) ?? [];
  return new Set(tokens.filter((token) => !CITATION_STOP_WORDS.has(token)));
}

function sharedSignificantTerms(answer: string, chunkContent: string): number {
  const answerTerms = tokenizeSignificant(answer);
  const chunkTerms = tokenizeSignificant(chunkContent);
  let overlap = 0;
  for (const term of answerTerms) {
    if (chunkTerms.has(term)) overlap += 1;
  }
  return overlap;
}

function findDistinctivePhraseOverlap(answer: string, chunkContent: string): boolean {
  const answerLower = answer.toLowerCase();
  const words =
    chunkContent
      .toLowerCase()
      .match(/\b[a-z][a-z0-9-]{3,}\b/g)
      ?.filter((word) => !CITATION_STOP_WORDS.has(word)) ?? [];

  for (let size = 4; size >= 3; size -= 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const phrase = words.slice(index, index + size).join(" ");
      if (phrase.length < 12) continue;
      if (answerLower.includes(phrase)) return true;
    }
  }

  return false;
}

function contentReferencesChunk(content: string, chunk: SearchResultItem): boolean {
  if (findMatchingAlias(content, chunkCitationAliases(chunk))) return true;
  if (sharedSignificantTerms(content, chunk.content) >= 4) return true;
  return findDistinctivePhraseOverlap(content, chunk.content);
}

function citationFromChunk(chunk: SearchResultItem): ChatCitation {
  return {
    documentId: chunk.documentId,
    chunkId: chunk.chunkId,
    documentName: chunk.documentName,
    excerpt: excerptFromChunk(chunk.content),
  };
}

function parseDocCitations(
  content: string,
  chunksByKey: Map<string, SearchResultItem>,
  citations: Map<string, ChatCitation>,
) {
  for (const match of content.matchAll(DOC_CITATION_PATTERN)) {
    const documentId = match[1];
    const chunkId = match[2];
    if (!documentId || !chunkId) continue;

    const key = `${documentId}:${chunkId}`;
    const chunk = chunksByKey.get(key);
    if (!chunk || citations.has(key)) continue;
    citations.set(key, citationFromChunk(chunk));
  }
}

function parseSourceCitations(
  content: string,
  retrievedChunks: SearchResultItem[],
  citations: Map<string, ChatCitation>,
) {
  for (const match of content.matchAll(SOURCE_CITATION_PATTERN)) {
    const sourceNumber = Number.parseInt(match[1] ?? "", 10);
    if (!Number.isFinite(sourceNumber) || sourceNumber < 1) continue;

    const chunk = retrievedChunks[sourceNumber - 1];
    if (!chunk) continue;

    const key = `${chunk.documentId}:${chunk.chunkId}`;
    if (citations.has(key)) continue;
    citations.set(key, citationFromChunk(chunk));
  }
}

function buildAliasMatchPattern(alias: string): RegExp {
  const escaped = escapeRegExp(alias);
  return new RegExp(
    `(?:\\*\\*${escaped}\\*\\*|(?<!\`)${escaped}(?!\`)|\`${escaped}\`)`,
    "i",
  );
}

function isSourceFormallyCited(
  content: string,
  sourceNumber: number,
  chunk: SearchResultItem,
): boolean {
  if (content.includes(`[doc:${chunk.documentId}:chunk:${chunk.chunkId}]`)) {
    return true;
  }

  const sourcePattern = new RegExp(
    `(?:\\(|\\[)?(?:Source|SOURCE)\\s*${sourceNumber}(?:\\)|\\]|\\b)`,
    "i",
  );
  return sourcePattern.test(content);
}

function buildDocumentNameMatchPattern(documentName: string): RegExp {
  return buildAliasMatchPattern(documentName);
}

function parseImplicitChunkCitations(
  content: string,
  retrievedChunks: SearchResultItem[],
  citations: Map<string, ChatCitation>,
) {
  const citedDocumentIds = new Set(
    Array.from(citations.values()).map((citation) => citation.documentId),
  );

  for (const chunk of retrievedChunks) {
    if (citedDocumentIds.has(chunk.documentId)) continue;
    if (!contentReferencesChunk(content, chunk)) continue;

    const key = `${chunk.documentId}:${chunk.chunkId}`;
    if (citations.has(key)) continue;

    citations.set(key, citationFromChunk(chunk));
    citedDocumentIds.add(chunk.documentId);
  }
}

function parseContentOverlapCitations(
  content: string,
  retrievedChunks: SearchResultItem[],
  citations: Map<string, ChatCitation>,
) {
  if (citations.size > 0) return;

  const citedDocumentIds = new Set<string>();
  const ranked = retrievedChunks
    .map((chunk) => ({
      chunk,
      overlap: sharedSignificantTerms(content, chunk.content),
    }))
    .filter((entry) => entry.overlap >= 2)
    .sort((left, right) => right.overlap - left.overlap)
    .slice(0, 3);

  for (const { chunk } of ranked) {
    if (citedDocumentIds.has(chunk.documentId)) continue;
    const key = `${chunk.documentId}:${chunk.chunkId}`;
    citations.set(key, citationFromChunk(chunk));
    citedDocumentIds.add(chunk.documentId);
  }
}

export function normalizeImplicitCitations(
  content: string,
  retrievedChunks: SearchResultItem[],
): string {
  let result = content;
  const injectedDocumentIds = new Set<string>();

  for (let index = 0; index < retrievedChunks.length; index += 1) {
    const chunk = retrievedChunks[index];
    const sourceNumber = index + 1;
    if (injectedDocumentIds.has(chunk.documentId)) continue;
    if (isSourceFormallyCited(result, sourceNumber, chunk)) {
      injectedDocumentIds.add(chunk.documentId);
      continue;
    }

    const alias =
      findMatchingAlias(result, chunkCitationAliases(chunk)) ??
      (contentReferencesChunk(result, chunk) ? chunk.documentName : null);
    if (!alias) continue;

    const pattern = buildAliasMatchPattern(alias);
    if (!pattern.test(result)) continue;

    result = result.replace(pattern, (match) => `${match} (Source ${sourceNumber})`);
    injectedDocumentIds.add(chunk.documentId);
  }

  return result;
}

export function parseAndValidateCitations(
  content: string,
  retrievedChunks: SearchResultItem[],
): ChatCitation[] {
  const chunksByKey = new Map(
    retrievedChunks.map((chunk) => [`${chunk.documentId}:${chunk.chunkId}`, chunk]),
  );
  const citations = new Map<string, ChatCitation>();

  parseDocCitations(content, chunksByKey, citations);
  parseSourceCitations(content, retrievedChunks, citations);
  parseImplicitChunkCitations(content, retrievedChunks, citations);
  parseContentOverlapCitations(content, retrievedChunks, citations);

  return Array.from(citations.values());
}

export function stripCitationMarkers(content: string): string {
  return content
    .split("\n")
    .map((line) =>
      line
        .replace(DOC_CITATION_PATTERN, "")
        .replace(SOURCE_CITATION_PATTERN, "")
        .replace(/[^\S\n]{2,}/g, " ")
        .replace(/\s+([,.;:!?])/g, "$1")
        .trimEnd(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasCitationSyntax(content: string): boolean {
  DOC_CITATION_PATTERN.lastIndex = 0;
  SOURCE_CITATION_PATTERN.lastIndex = 0;
  return DOC_CITATION_PATTERN.test(content) || SOURCE_CITATION_PATTERN.test(content);
}
