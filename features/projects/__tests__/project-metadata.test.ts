import { describe, expect, it } from "vitest";

import { getDefaultAgentFromMetadata } from "../lib/default-agents";
import { collectDealStatusOptions } from "../lib/deal-statuses";

describe("default agent helpers", () => {
  it("reads default agent from metadata", () => {
    expect(getDefaultAgentFromMetadata({ defaultAgent: "risk" })).toBe("risk");
    expect(getDefaultAgentFromMetadata({ defaultAgent: "invalid" })).toBeNull();
    expect(getDefaultAgentFromMetadata(null)).toBeNull();
  });
});

describe("deal status helpers", () => {
  it("collects unique deal statuses from projects", () => {
    const options = collectDealStatusOptions([
      { dealStatus: "In diligence" },
      { dealStatus: "Custom status" },
      { dealStatus: null },
    ]);

    expect(options).toContain("In diligence");
    expect(options).toContain("Custom status");
    expect(options).toContain("Negotiation");
  });
});
