import { describe, expect, it } from "vitest";

import { buildSearchUrlParams, parseSearchUrlState } from "../lib/url-state";

describe("search url state", () => {
  it("parses query mode and filters from search params", () => {
    const params = new URLSearchParams({
      q: "revenue covenant",
      mode: "keyword",
      type: "PDF",
      classification: "FINANCIAL",
      folderId: "folder-1",
      tag: "contract",
      dateFrom: "2024-01-01T00:00:00.000Z",
      dateTo: "2024-12-31T23:59:59.999Z",
    });

    const state = parseSearchUrlState(params);

    expect(state.query).toBe("revenue covenant");
    expect(state.mode).toBe("keyword");
    expect(state.filters).toEqual({
      type: "PDF",
      classification: "FINANCIAL",
      folderId: "folder-1",
      tags: ["contract"],
      dateFrom: "2024-01-01T00:00:00.000Z",
      dateTo: "2024-12-31T23:59:59.999Z",
    });
  });

  it("defaults mode to hybrid and omits empty filters", () => {
    const state = parseSearchUrlState(new URLSearchParams());
    expect(state.mode).toBe("hybrid");
    expect(state.filters).toEqual({});
  });

  it("builds shareable URL params from state", () => {
    const params = buildSearchUrlParams({
      query: "GDPR",
      mode: "semantic",
      filters: { type: "PDF", tags: ["compliance"] },
    });

    expect(params.get("q")).toBe("GDPR");
    expect(params.get("mode")).toBe("semantic");
    expect(params.get("type")).toBe("PDF");
    expect(params.get("tags")).toBe("compliance");
  });

  it("parses comma-separated tags and legacy single tag param", () => {
    const multi = parseSearchUrlState(
      new URLSearchParams({ tags: "contract,financial,legal" }),
    );
    expect(multi.filters.tags).toEqual(["contract", "financial", "legal"]);

    const legacy = parseSearchUrlState(new URLSearchParams({ tag: "contract" }));
    expect(legacy.filters.tags).toEqual(["contract"]);
  });
});
