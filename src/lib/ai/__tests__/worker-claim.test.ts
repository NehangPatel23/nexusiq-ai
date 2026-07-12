import { describe, expect, it, vi } from "vitest";

import { claimPendingDocuments } from "../processing/worker-claim";

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";

describe("worker claim", () => {
  it("returns claimed document ids from atomic update", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { id: "doc-1" },
      { id: "doc-2" },
    ]);

    const ids = await claimPendingDocuments(2);
    expect(ids).toEqual(["doc-1", "doc-2"]);
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });
});
