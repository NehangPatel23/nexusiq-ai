import { describe, expect, it } from "vitest";

import {
  dedupeTaskKey,
  mapExecutiveActionToTaskDraft,
  mapFindingToTaskDraft,
  severityToTaskPriority,
} from "@/features/actions/lib/from-findings";
import { createTaskBodySchema, updateTaskBodySchema } from "@/features/actions/schemas";

describe("task from-findings mapper", () => {
  it("maps finding severity to task priority", () => {
    expect(severityToTaskPriority("CRITICAL")).toBe("CRITICAL");
    expect(severityToTaskPriority("HIGH")).toBe("URGENT");
    expect(severityToTaskPriority(null)).toBe("MEDIUM");
  });

  it("maps finding to task draft", () => {
    const draft = mapFindingToTaskDraft({
      id: "11111111-1111-1111-1111-111111111111",
      title: "Lease liability gap",
      description: "ASC 842 missing schedules",
      severity: "HIGH",
      documentId: "22222222-2222-2222-2222-222222222222",
    });
    expect(draft.priority).toBe("URGENT");
    expect(draft.findingId).toBe("11111111-1111-1111-1111-111111111111");
    expect(draft.impact).toContain("HIGH");
  });

  it("maps executive action drafts", () => {
    const draft = mapExecutiveActionToTaskDraft("Confirm escrow holdback", 0);
    expect(draft.priority).toBe("URGENT");
    expect(draft.findingId).toBeNull();
  });

  it("builds dedupe keys", () => {
    expect(dedupeTaskKey("A", "f1")).toBe("a::f1");
    expect(dedupeTaskKey("A", null)).toBe("a::");
  });
});

describe("task schemas", () => {
  it("requires title on create", () => {
    expect(() => createTaskBodySchema.parse({ title: "" })).toThrow();
  });

  it("requires at least one update field", () => {
    expect(() => updateTaskBodySchema.parse({})).toThrow();
  });
});
