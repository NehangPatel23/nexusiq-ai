import { describe, expect, it } from "vitest";

import { entityMergeKey, normalizeEntityName, normalizeEntityType } from "@/features/graph/lib/normalize";
import { extractedGraphPayloadSchema } from "@/features/graph/schemas";

describe("graph normalize", () => {
  it("normalizes entity types", () => {
    expect(normalizeEntityType("ORGANIZATION")).toBe("organization");
    expect(normalizeEntityType("Company")).toBe("organization");
    expect(normalizeEntityType("PERSON")).toBe("person");
    expect(normalizeEntityType("MONEY")).toBe("amount");
  });

  it("builds merge keys", () => {
    expect(entityMergeKey("Acme Corp", "ORGANIZATION")).toBe("organization::acme corp");
    expect(normalizeEntityName("  Acme   Corp ")).toBe("Acme Corp");
  });
});

describe("extractedGraphPayloadSchema", () => {
  it("accepts relations with type or relationType", () => {
    const parsed = extractedGraphPayloadSchema.safeParse({
      entities: [{ name: "Acme", type: "organization" }],
      relations: [
        {
          source: "Acme",
          target: "Jane Doe",
          type: "employs",
          confidence: 0.9,
          sourceChunkId: "c1",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
