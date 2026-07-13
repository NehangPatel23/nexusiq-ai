import { describe, expect, it } from "vitest";

import { mapSeverityGroups } from "@/features/intelligence/lib/findings-stats";

describe("findings-stats", () => {
  it("maps severity groups into dashboard counts", () => {
    expect(
      mapSeverityGroups([
        { severity: "CRITICAL", _count: 2 },
        { severity: "HIGH", _count: 3 },
        { severity: "MEDIUM", _count: 5 },
        { severity: "LOW", _count: 1 },
      ]),
    ).toEqual({
      critical: 2,
      high: 3,
      medium: 5,
      low: 1,
    });
  });

  it("returns zero counts for missing severities", () => {
    expect(mapSeverityGroups([{ severity: "HIGH", _count: 4 }])).toEqual({
      critical: 0,
      high: 4,
      medium: 0,
      low: 0,
    });
  });
});
