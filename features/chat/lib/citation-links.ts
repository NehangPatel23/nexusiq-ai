import type { ChatCitation } from "@/lib/ai/citations";
import type { SearchResultItem } from "@/features/search/lib/types";

export function sourceIndexForCitation(
  citation: ChatCitation,
  retrievedChunks: SearchResultItem[],
  citationList?: ChatCitation[],
): number {
  const index = retrievedChunks.findIndex(
    (chunk) => chunk.documentId === citation.documentId && chunk.chunkId === citation.chunkId,
  );
  if (index >= 0) return index + 1;
  if (citationList) {
    const listIndex = citationList.findIndex(
      (item) => item.documentId === citation.documentId && item.chunkId === citation.chunkId,
    );
    if (listIndex >= 0) return listIndex + 1;
  }
  return 0;
}

export function dataRoomCitationHref(
  projectId: string,
  citation: ChatCitation,
  sourceIndex: number,
): string {
  const params = new URLSearchParams({
    doc: citation.documentId,
    chunk: citation.chunkId,
  });
  if (sourceIndex > 0) params.set("source", String(sourceIndex));
  const excerpt = citation.excerpt.slice(0, 120).trim();
  if (excerpt) params.set("highlight", excerpt);
  return `/dashboard/projects/${projectId}/data-room?${params.toString()}`;
}

export function injectInlineCitationLinks(
  content: string,
  projectId: string,
  citations: ChatCitation[],
  retrievedChunks: SearchResultItem[] = [],
): string {
  let result = content;
  for (const citation of citations) {
    const index = sourceIndexForCitation(citation, retrievedChunks, citations);
    if (index === 0) continue;
    const href = dataRoomCitationHref(projectId, citation, index);
    const link = `[${index}](${href})`;
    const patterns = [
      new RegExp(`\\(Source\\s*${index}\\)`, "gi"),
      new RegExp(`\\[Source\\s*${index}\\]`, "gi"),
      new RegExp(`\\bSource\\s*${index}\\b`, "gi"),
    ];
    for (const pattern of patterns) {
      if (pattern.test(result)) {
        result = result.replace(pattern, link);
        break;
      }
    }
  }
  return result;
}
