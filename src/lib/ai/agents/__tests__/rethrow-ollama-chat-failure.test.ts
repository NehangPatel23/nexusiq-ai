import { describe, expect, it } from "vitest";

import {
  OllamaTimeoutError,
  OllamaUnavailableError,
  rethrowOllamaChatFailure,
} from "@/lib/ai/agents/run-agent";
import { OllamaTimeoutError as ClientTimeoutError } from "@/lib/ai/ollama-client";

describe("rethrowOllamaChatFailure", () => {
  it("maps abort/timeout messages to OllamaTimeoutError", () => {
    expect(() => rethrowOllamaChatFailure(new ClientTimeoutError("slow"))).toThrow(
      OllamaTimeoutError,
    );
    expect(() => rethrowOllamaChatFailure(new Error("request timed out"))).toThrow(
      OllamaTimeoutError,
    );
  });

  it("maps connectivity failures to OllamaUnavailableError", () => {
    expect(() => rethrowOllamaChatFailure(new Error("fetch failed"))).toThrow(
      OllamaUnavailableError,
    );
    expect(() => rethrowOllamaChatFailure(new Error("Ollama chat failed (502): bad gateway"))).toThrow(
      OllamaUnavailableError,
    );
  });

  it("preserves validation-style errors so the run can fail without aborting Full analysis", () => {
    expect(() => rethrowOllamaChatFailure(new Error("Agent output validation failed"))).toThrow(
      /validation failed/i,
    );
  });
});
