export type OfflineDateCandidate = {
  title: string;
  description: string;
  eventDate: string;
  sourceChunkId: string;
  documentId: string;
  lowConfidence: true;
};

const ISO_DATE =
  /\b((?:20\d{2}|19\d{2})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/g;

const MONTH_DATE =
  /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(?:20\d{2}|19\d{2}))\b/gi;

const SLASH_DATE = /\b((?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:20\d{2}|19\d{2}))\b/g;

function lineAround(content: string, index: number): string {
  const start = content.lastIndexOf("\n", index);
  const end = content.indexOf("\n", index);
  const from = start === -1 ? 0 : start + 1;
  const to = end === -1 ? content.length : end;
  return content.slice(from, to).replace(/\s+/g, " ").trim();
}

function toIsoDate(raw: string): string | null {
  const isoDay = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDay) {
    return `${isoDay[1]}-${isoDay[2]}-${isoDay[3]}T00:00:00.000Z`;
  }

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const month = slash[1].padStart(2, "0");
    const day = slash[2].padStart(2, "0");
    return `${slash[3]}-${month}-${day}T00:00:00.000Z`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  // Normalize calendar day in UTC to avoid local TZ shifting month-name parses.
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  // Prefer local components when the parse clearly used local time (month names).
  if (/[a-zA-Z]/.test(raw)) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}T00:00:00.000Z`;
  }
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

function titleFromLine(line: string, dateRaw: string): string {
  const withoutDate = line.replace(dateRaw, "").replace(/^[–—:\-\s]+|[–—:\-\s]+$/g, "").trim();
  if (withoutDate.length >= 8) {
    return withoutDate.slice(0, 200);
  }
  return line.slice(0, 200);
}

/**
 * Offline boost: scan chunks for explicit dates. Never invent titles without text evidence.
 */
export function extractOfflineDateCandidates(
  chunks: Array<{ chunkId: string; documentId: string; content: string }>,
): OfflineDateCandidate[] {
  const candidates: OfflineDateCandidate[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const patterns: RegExp[] = [ISO_DATE, MONTH_DATE, SLASH_DATE];
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      for (const match of chunk.content.matchAll(pattern)) {
        const raw = match[1] ?? match[0];
        const iso = toIsoDate(raw);
        if (!iso) continue;
        const line = lineAround(chunk.content, match.index ?? 0);
        if (!line || line.length < 12) continue;
        const title = titleFromLine(line, raw);
        if (title.length < 8) continue;
        const key = `${chunk.chunkId}:${iso.slice(0, 10)}:${title.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({
          title,
          description: line.slice(0, 500),
          eventDate: iso,
          sourceChunkId: chunk.chunkId,
          documentId: chunk.documentId,
          lowConfidence: true,
        });
      }
    }
  }

  return candidates.slice(0, 40);
}
