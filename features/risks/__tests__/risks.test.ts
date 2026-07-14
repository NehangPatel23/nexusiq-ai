import { describe, expect, it } from "vitest";

import { compositeRiskScoreFromSeverities } from "@/features/risks/lib/risks-summary";
import { EMPTY_SEVERITY_COUNTS } from "@/features/intelligence/lib/severity-summary";

describe("risk score rollup", () => {
  it("returns 0 for empty counts", () => {
    expect(compositeRiskScoreFromSeverities(EMPTY_SEVERITY_COUNTS)).toBe(0);
  });

  it("weights critical findings highest", () => {
    const lowOnly = compositeRiskScoreFromSeverities({
      ...EMPTY_SEVERITY_COUNTS,
      low: 4,
    });
    const critical = compositeRiskScoreFromSeverities({
      ...EMPTY_SEVERITY_COUNTS,
      critical: 2,
    });
    expect(critical).toBeGreaterThan(lowOnly);
    expect(critical).toBeLessThanOrEqual(100);
  });

  it("caps at 100", () => {
    expect(
      compositeRiskScoreFromSeverities({
        critical: 20,
        high: 20,
        medium: 20,
        low: 20,
      }),
    ).toBe(100);
  });
});
