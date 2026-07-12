import { describe, expect, it } from "vitest";

import { getProcessingErrorHint } from "../lib/processing-errors";

describe("processing-errors", () => {
  it("returns Ollama guidance for unreachable errors", () => {
    expect(getProcessingErrorHint("Ollama is unreachable — start Ollama locally")).toContain(
      "pnpm worker:process",
    );
  });

  it("returns extraction guidance for empty documents", () => {
    expect(getProcessingErrorHint("No extractable text found in document")).toContain("TXT");
  });
});
