import { describe, expect, it } from "vitest";

import { getChecklistForProjectType } from "@/features/missing/lib/checklists";
import { matchChecklistAgainstDocuments } from "@/features/missing/lib/match-checklist";

describe("missing checklist matcher", () => {
  it("returns MA checklist items", () => {
    const items = getChecklistForProjectType("MA");
    expect(items.some((i) => /financial statements/i.test(i.title))).toBe(true);
    expect(items.some((i) => /cap table/i.test(i.title))).toBe(true);
  });

  it("marks found when classification matches", () => {
    const results = matchChecklistAgainstDocuments({
      projectType: "VENDOR_DD",
      documents: [
        {
          id: "1",
          name: "soc2-type-ii.pdf",
          classification: "COMPLIANCE",
          tags: [],
        },
      ],
    });
    const soc = results.find((r) => /soc/i.test(r.item.title));
    expect(soc?.found).toBe(true);
  });

  it("does not invent gaps for uploaded matching docs", () => {
    const results = matchChecklistAgainstDocuments({
      projectType: "AUDIT",
      documents: [
        {
          id: "1",
          name: "security-policies.pdf",
          classification: "COMPLIANCE",
          tags: ["policy"],
        },
        {
          id: "2",
          name: "control-evidence.xlsx",
          classification: "COMPLIANCE",
          tags: ["controls"],
        },
        {
          id: "3",
          name: "prior-audit-report.pdf",
          classification: "COMPLIANCE",
          tags: ["audit"],
        },
      ],
    });
    const gaps = results.filter((r) => !r.found);
    expect(gaps.length).toBeLessThan(results.length);
    expect(results.every((r) => r.found || r.matchedDocumentIds.length === 0)).toBe(true);
  });

  it("uses name hints for SOC2 when classification is OTHER", () => {
    const results = matchChecklistAgainstDocuments({
      projectType: "VENDOR_DD",
      documents: [
        {
          id: "1",
          name: "Acme SOC2 Report 2025.pdf",
          classification: "OTHER",
          tags: [],
        },
      ],
    });
    const soc = results.find((r) => /soc/i.test(r.item.title));
    expect(soc?.found).toBe(true);
  });
});
