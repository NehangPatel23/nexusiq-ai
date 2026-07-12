import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearRecentSearches,
  loadRecentSearches,
  saveRecentSearch,
} from "../lib/recent-searches";

const PROJECT_ID = "project-abc";

describe("recent searches", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns empty list when storage is empty", () => {
    expect(loadRecentSearches(PROJECT_ID)).toEqual([]);
  });

  it("saves and loads recent searches per project", () => {
    const updated = saveRecentSearch(PROJECT_ID, {
      query: "revenue covenant",
      mode: "hybrid",
      filters: { type: "PDF" },
    });

    expect(updated).toHaveLength(1);
    expect(updated[0]?.query).toBe("revenue covenant");
    expect(updated[0]?.mode).toBe("hybrid");
    expect(updated[0]?.filters).toEqual({ type: "PDF" });

    const loaded = loadRecentSearches(PROJECT_ID);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.query).toBe("revenue covenant");
  });

  it("deduplicates identical entries and keeps newest first", () => {
    saveRecentSearch(PROJECT_ID, { query: "alpha", mode: "keyword", filters: {} });
    saveRecentSearch(PROJECT_ID, { query: "beta", mode: "keyword", filters: {} });
    const updated = saveRecentSearch(PROJECT_ID, { query: "alpha", mode: "keyword", filters: {} });

    expect(updated.map((entry) => entry.query)).toEqual(["alpha", "beta"]);
  });

  it("clears recent searches for a project", () => {
    saveRecentSearch(PROJECT_ID, { query: "alpha", mode: "keyword", filters: {} });
    clearRecentSearches(PROJECT_ID);
    expect(loadRecentSearches(PROJECT_ID)).toEqual([]);
  });
});
