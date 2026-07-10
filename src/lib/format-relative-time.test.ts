import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "@/lib/format-relative-time";

describe("formatRelativeTime", () => {
  it("formats recent times relatively", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const result = formatRelativeTime(oneHourAgo);
    expect(result).toMatch(/hour|hr/i);
  });

  it("formats older dates", () => {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const result = formatRelativeTime(lastYear);
    expect(result.length).toBeGreaterThan(0);
  });
});
