import { describe, expect, it } from "vitest";

import {
  aggregateOpenFindingsBySeverity,
  EMPTY_SEVERITY_COUNTS,
  totalFindingCount,
} from "@/features/intelligence/lib/severity-summary";

describe("severity-summary", () => {
  it("aggregates open findings across agent details by severity", () => {
    const counts = aggregateOpenFindingsBySeverity([
      {
        findings: [
          { severity: "CRITICAL", status: "OPEN" },
          { severity: "HIGH", status: "OPEN" },
        ],
      },
      {
        findings: [
          { severity: "HIGH", status: "OPEN" },
          { severity: "MEDIUM", status: "OPEN" },
          { severity: "LOW", status: "OPEN" },
        ],
      },
    ]);

    expect(counts).toEqual({ critical: 1, high: 2, medium: 1, low: 1 });
    expect(totalFindingCount(counts)).toBe(5);
  });

  it("excludes non-open findings and null severities", () => {
    const counts = aggregateOpenFindingsBySeverity([
      {
        findings: [
          { severity: "HIGH", status: "OPEN" },
          { severity: "HIGH", status: "SUPERSEDED" },
          { severity: "CRITICAL", status: "RESOLVED" },
          { severity: null, status: "OPEN" },
        ],
      },
    ]);

    expect(counts).toEqual({ critical: 0, high: 1, medium: 0, low: 0 });
  });

  it("skips missing details and treats findings without status as open", () => {
    const counts = aggregateOpenFindingsBySeverity([
      undefined,
      null,
      { findings: [{ severity: "MEDIUM" }] },
    ]);

    expect(counts).toEqual({ critical: 0, high: 0, medium: 1, low: 0 });
  });

  it("returns empty counts for no details", () => {
    expect(aggregateOpenFindingsBySeverity([])).toEqual(EMPTY_SEVERITY_COUNTS);
  });
});
