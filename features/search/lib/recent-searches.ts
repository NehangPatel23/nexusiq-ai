import type { SearchFilters, SearchMode } from "./types";

const MAX_RECENT = 10;
const STORAGE_PREFIX = "nexusiq:recent-search:";

export type RecentSearchEntry = {
  query: string;
  mode: SearchMode;
  filters: SearchFilters;
  searchedAt: string;
};

function storageKey(projectId: string) {
  return `${STORAGE_PREFIX}${projectId}`;
}

export function loadRecentSearches(projectId: string): RecentSearchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSearchEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(
  projectId: string,
  entry: Omit<RecentSearchEntry, "searchedAt">,
): RecentSearchEntry[] {
  if (typeof window === "undefined") return [];
  const trimmed = entry.query.trim();
  if (!trimmed) return loadRecentSearches(projectId);

  const next: RecentSearchEntry = {
    ...entry,
    query: trimmed,
    filters: entry.filters ?? {},
    searchedAt: new Date().toISOString(),
  };

  const existing = loadRecentSearches(projectId).filter(
    (item) =>
      !(
        item.query === next.query &&
        item.mode === next.mode &&
        JSON.stringify(item.filters) === JSON.stringify(next.filters)
      ),
  );

  const updated = [next, ...existing].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(updated));
  } catch {
    // Quota or private mode — ignore
  }
  return updated;
}

export function clearRecentSearches(projectId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(projectId));
  } catch {
    // ignore
  }
}
