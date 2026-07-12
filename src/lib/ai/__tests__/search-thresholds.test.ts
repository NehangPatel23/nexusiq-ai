import { afterEach, describe, expect, it } from "vitest";

import {
  buildTsQuerySql,
  getKeywordMinRank,
  getSemanticMinScore,
  KEYWORD_MIN_RANK,
  SEMANTIC_MIN_SCORE,
} from "@/lib/ai/search-thresholds";

describe("search thresholds", () => {
  const originalKeyword = process.env.SEARCH_KEYWORD_MIN_RANK;
  const originalSemantic = process.env.SEARCH_SEMANTIC_MIN_SCORE;

  afterEach(() => {
    if (originalKeyword === undefined) {
      delete process.env.SEARCH_KEYWORD_MIN_RANK;
    } else {
      process.env.SEARCH_KEYWORD_MIN_RANK = originalKeyword;
    }
    if (originalSemantic === undefined) {
      delete process.env.SEARCH_SEMANTIC_MIN_SCORE;
    } else {
      process.env.SEARCH_SEMANTIC_MIN_SCORE = originalSemantic;
    }
  });

  it("uses default thresholds when env is unset", () => {
    delete process.env.SEARCH_KEYWORD_MIN_RANK;
    delete process.env.SEARCH_SEMANTIC_MIN_SCORE;

    expect(getKeywordMinRank()).toBe(KEYWORD_MIN_RANK);
    expect(getSemanticMinScore()).toBe(SEMANTIC_MIN_SCORE);
  });

  it("reads thresholds from env when valid", () => {
    process.env.SEARCH_KEYWORD_MIN_RANK = "0.05";
    process.env.SEARCH_SEMANTIC_MIN_SCORE = "0.55";

    expect(getKeywordMinRank()).toBe(0.05);
    expect(getSemanticMinScore()).toBe(0.55);
  });

  it("falls back to defaults for invalid env values", () => {
    process.env.SEARCH_KEYWORD_MIN_RANK = "not-a-number";
    process.env.SEARCH_SEMANTIC_MIN_SCORE = "2";

    expect(getKeywordMinRank()).toBe(KEYWORD_MIN_RANK);
    expect(getSemanticMinScore()).toBe(SEMANTIC_MIN_SCORE);
  });

  it("builds tsquery SQL fragment", () => {
    const sql = buildTsQuerySql("revenue growth");
    expect(sql.sql).toContain("websearch_to_tsquery");
    expect(sql.sql).toContain("plainto_tsquery");
  });
});
