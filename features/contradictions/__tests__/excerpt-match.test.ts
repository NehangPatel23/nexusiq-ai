import { describe, expect, it } from "vitest";

import {
  dateSearchVariants,
  excerptAroundValue,
  findValueMatch,
} from "@/features/contradictions/lib/excerpt-match";

describe("contradiction excerpt matching", () => {
  it("matches ISO dates to natural-language dates", () => {
    const text =
      "HELIX ANALYTICS — MATERIAL CONTRACTS SUMMARY As of January 15, 2024 | Prepared by Morrison.";
    const match = findValueMatch(text, "2024-01-15", "DATE");
    expect(match?.matchedText).toBe("January 15, 2024");
    expect(dateSearchVariants("2024-01-15")).toContain("January 15, 2024");
  });

  it("windows excerpt around the matched value instead of the document start", () => {
    const preamble = "A".repeat(400);
    const text = `${preamble} Net Revenue Retention: 118% remaining narrative`;
    const { excerpt, match } = excerptAroundValue(text, "118%", { factType: "METRIC" });
    expect(match?.matchedText).toBe("118%");
    expect(excerpt).toContain("118%");
    expect(excerpt?.startsWith("AAA")).toBe(false);
  });

  it("matches percentage and money amount variants", () => {
    expect(findValueMatch("ARR: $38.3M (+24% YoY)", "24%", "METRIC")?.matchedText).toBe("24%");
    expect(
      findValueMatch("ended the period with $38.3M in ARR", "$38.3M", "AMOUNT")?.matchedText,
    ).toBe("$38.3M");
  });
});
