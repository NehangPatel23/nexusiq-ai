import { describe, expect, it } from "vitest";

import {
  classifyFromKeywords,
  normalizeClassification,
} from "../processing/classify";

describe("classify helpers", () => {
  it("normalizes classification labels", () => {
    expect(normalizeClassification("financial")).toBe("FINANCIAL");
    expect(normalizeClassification("legal")).toBe("LEGAL");
    expect(normalizeClassification("unknown-label")).toBe("OTHER");
  });

  it("classifies financial keywords", () => {
    const result = classifyFromKeywords("Consolidated revenue and EBITDA for FY2024.");
    expect(result).toBe("FINANCIAL");
  });

  it("classifies contract keywords", () => {
    const result = classifyFromKeywords("Master Service Agreement terms and conditions.");
    expect(result).toBe("CONTRACT");
  });
});
