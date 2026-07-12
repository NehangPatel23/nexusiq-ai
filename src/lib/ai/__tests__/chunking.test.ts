import { describe, expect, it } from "vitest";

import {
  chunkText,
  computeContentHash,
  countTokens,
} from "../processing/chunking";

describe("chunking", () => {
  it("computes stable SHA-256 content hashes", () => {
    const a = computeContentHash(Buffer.from("hello"));
    const b = computeContentHash(Buffer.from("hello"));
    const c = computeContentHash(Buffer.from("world"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(64);
  });

  it("counts tokens for sample text", () => {
    expect(countTokens("hello world")).toBeGreaterThan(0);
  });

  it("returns a single chunk for short text", () => {
    const chunks = chunkText("Short document body.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.chunkIndex).toBe(0);
    expect(chunks[0]?.content).toContain("Short");
  });

  it("splits long text into overlapping chunks", () => {
    const paragraph = "Sentence one. ".repeat(400);
    const chunks = chunkText(paragraph, { chunkSize: 64, overlap: 8 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.chunkIndex).toBe(0);
    expect(chunks[1]?.chunkIndex).toBe(1);
  });
});
