export type TimelineDedupeKey = {
  title: string;
  eventDate: Date;
  documentId?: string | null;
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Jaccard similarity on word tokens. */
export function titleSimilarity(a: string, b: string): number {
  const aTokens = new Set(normalizeTitle(a).split(" ").filter(Boolean));
  const bTokens = new Set(normalizeTitle(b).split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }
  const union = aTokens.size + bTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function isDuplicateTimelineEvent(
  candidate: TimelineDedupeKey,
  existing: TimelineDedupeKey,
  similarityThreshold = 0.72,
): boolean {
  if (dayKey(candidate.eventDate) !== dayKey(existing.eventDate)) return false;
  if (
    candidate.documentId &&
    existing.documentId &&
    candidate.documentId !== existing.documentId
  ) {
    return false;
  }
  if (normalizeTitle(candidate.title) === normalizeTitle(existing.title)) return true;
  return titleSimilarity(candidate.title, existing.title) >= similarityThreshold;
}

export function dedupeTimelineCandidates<T extends TimelineDedupeKey>(events: T[]): T[] {
  const kept: T[] = [];
  for (const event of events) {
    const duplicate = kept.some((row) => isDuplicateTimelineEvent(event, row));
    if (!duplicate) kept.push(event);
  }
  return kept;
}
