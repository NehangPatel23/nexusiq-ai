/**
 * Locate a contradiction value inside chunk text even when formats differ
 * (ISO date vs "January 15, 2024", $42.0M vs 42.0 million, etc.).
 */

export type ValueMatch = {
  index: number;
  length: number;
  matchedText: string;
};

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function parseIsoDate(value: string): { y: number; m: number; d: number } | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
}

export function dateSearchVariants(value: string): string[] {
  const iso = parseIsoDate(value);
  if (!iso) return uniqueStrings([value]);
  const { y, m, d } = iso;
  const long = MONTHS_LONG[m - 1];
  const short = MONTHS_SHORT[m - 1];
  if (!long || !short) return uniqueStrings([value]);
  return uniqueStrings([
    value,
    `${long} ${d}, ${y}`,
    `${long} ${d} ${y}`,
    `${short} ${d}, ${y}`,
    `${short} ${d} ${y}`,
    `${d} ${long} ${y}`,
    `${d} ${short} ${y}`,
    `${m}/${d}/${y}`,
    `${d}/${m}/${y}`,
    `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`,
    `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
  ]);
}

export function amountSearchVariants(value: string): string[] {
  const raw = value.trim();
  const variants = [raw, raw.replace(/,/g, "")];

  const money = raw.match(/^\$?\s*([\d,.]+)\s*([kKmMbB])?(illion)?\.?$/);
  if (money) {
    const num = money[1]!.replace(/,/g, "");
    const unit = (money[2] ?? "").toLowerCase();
    variants.push(`$${num}${unit ? unit.toUpperCase() : ""}`);
    variants.push(`${num}${unit ? unit.toUpperCase() : ""}`);
    if (unit === "m") {
      variants.push(`$${num} million`, `${num} million`, `$${num}M`, `${num}M`);
    }
    if (unit === "k") {
      variants.push(`$${num} thousand`, `${num} thousand`, `$${num}K`, `${num}K`);
    }
    if (unit === "b") {
      variants.push(`$${num} billion`, `${num} billion`, `$${num}B`, `${num}B`);
    }
  }

  const pct = raw.match(/^([\d,.]+)\s*%$/);
  if (pct) {
    const num = pct[1]!;
    variants.push(`${num}%`, `${num} percent`, `${num} per cent`);
  }

  return uniqueStrings(variants);
}

export function valueSearchVariants(
  value: string,
  factType?: string | null,
): string[] {
  const type = (factType ?? "").toUpperCase();
  if (type === "DATE" || parseIsoDate(value)) {
    return dateSearchVariants(value);
  }
  if (type === "AMOUNT" || type === "METRIC" || /[$%]/.test(value)) {
    return amountSearchVariants(value);
  }
  return uniqueStrings([value]);
}

export function findValueMatch(
  content: string,
  value: string,
  factType?: string | null,
): ValueMatch | null {
  if (!content || !value.trim()) return null;
  const haystack = content;
  const lower = haystack.toLowerCase();

  for (const candidate of valueSearchVariants(value, factType)) {
    const idx = lower.indexOf(candidate.toLowerCase());
    if (idx >= 0) {
      return {
        index: idx,
        length: candidate.length,
        matchedText: haystack.slice(idx, idx + candidate.length),
      };
    }
  }

  // Loose numeric fall-back: find the digits from ISO/money near related wording.
  const digits = value.replace(/[^\d.]/g, "");
  if (digits.length >= 2) {
    const loose = new RegExp(`\\$?\\b${escapeRegExp(digits)}\\b%?`, "i");
    const match = loose.exec(haystack);
    if (match?.index != null) {
      return {
        index: match.index,
        length: match[0].length,
        matchedText: match[0],
      };
    }
  }

  return null;
}

export function excerptAroundValue(
  content: string | null | undefined,
  value: string,
  options?: {
    factType?: string | null;
    radius?: number;
    maxLength?: number;
  },
): { excerpt: string | null; match: ValueMatch | null } {
  if (!content) return { excerpt: null, match: null };
  const normalized = content.trim().replace(/\s+/g, " ");
  const match = findValueMatch(normalized, value, options?.factType);
  const maxLength = options?.maxLength ?? 520;
  const radius = options?.radius ?? 180;

  if (!match) {
    const excerpt =
      normalized.length > maxLength
        ? `${normalized.slice(0, maxLength)}…`
        : normalized;
    return { excerpt, match: null };
  }

  const start = Math.max(0, match.index - radius);
  const end = Math.min(normalized.length, match.index + match.length + radius);
  let excerpt = normalized.slice(start, end);
  if (start > 0) excerpt = `…${excerpt}`;
  if (end < normalized.length) excerpt = `${excerpt}…`;
  return { excerpt, match };
}
