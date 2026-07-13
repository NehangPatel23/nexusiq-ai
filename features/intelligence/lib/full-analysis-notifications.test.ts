import { describe, expect, it } from "vitest";

import { buildIntelligenceNotificationLink } from "@/features/intelligence/lib/full-analysis-notifications";

describe("buildIntelligenceNotificationLink", () => {
  it("links to the intelligence tab by default", () => {
    expect(buildIntelligenceNotificationLink("proj_abc")).toBe(
      "/dashboard/projects/proj_abc/intelligence",
    );
  });

  it("deep-links to executive or consensus when provided", () => {
    expect(buildIntelligenceNotificationLink("proj_abc", "executive")).toBe(
      "/dashboard/projects/proj_abc/intelligence?tab=executive",
    );
    expect(buildIntelligenceNotificationLink("proj_abc", "consensus")).toBe(
      "/dashboard/projects/proj_abc/intelligence?tab=consensus",
    );
  });
});
