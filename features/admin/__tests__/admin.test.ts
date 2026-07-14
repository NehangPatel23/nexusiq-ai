import { describe, expect, it } from "vitest";

import { formatBytes } from "@/features/admin/lib/format-bytes";
import { describeFtsReindexScope } from "@/features/admin/lib/org-scope";
import { adminReindexSchema, adminRetryQueueSchema } from "@/features/admin/schemas";

describe("admin helpers", () => {
  it("formatBytes scales units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
  });

  it("describeFtsReindexScope documents english tsvector rebuild", () => {
    expect(describeFtsReindexScope("org-1", "proj-1")).toEqual({
      organizationId: "org-1",
      projectId: "proj-1",
      language: "english",
      setExpression: "to_tsvector('english', content)",
    });
    expect(describeFtsReindexScope("org-1").projectId).toBeNull();
  });

  it("reindex schema requires confirm true", () => {
    expect(
      adminReindexSchema.safeParse({ mode: "fts", confirm: true }).success,
    ).toBe(true);
    expect(adminReindexSchema.safeParse({ mode: "fts", confirm: false }).success).toBe(
      false,
    );
    expect(adminReindexSchema.safeParse({ mode: "embeddings" }).success).toBe(false);
  });

  it("retry schema requires confirm true", () => {
    expect(adminRetryQueueSchema.safeParse({ confirm: true }).success).toBe(true);
    expect(adminRetryQueueSchema.safeParse({ confirm: false }).success).toBe(false);
  });
});
