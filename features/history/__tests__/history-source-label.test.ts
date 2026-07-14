import { describe, expect, it } from "vitest";

import { resolveHistorySourceLabel } from "@/features/history/lib/history-feed";

describe("resolveHistorySourceLabel", () => {
  it("labels agent runs from the Data Room audit stream as Intelligence", () => {
    expect(
      resolveHistorySourceLabel({
        source: "data_room",
        action: "AGENT_RUN",
        dataRoomAction: "AGENT_RUN_COMPLETED",
      }),
    ).toBe("Intelligence");

    expect(
      resolveHistorySourceLabel({
        source: "data_room",
        action: "AGENT_RUN",
        dataRoomAction: "AGENT_RUN_FAILED",
      }),
    ).toBe("Intelligence");
  });

  it("labels report events as Reports even when sourced from Data Room audit", () => {
    expect(
      resolveHistorySourceLabel({
        source: "data_room",
        action: "REPORT",
        dataRoomAction: "REPORT_GENERATED",
      }),
    ).toBe("Reports");
  });

  it("labels file operations as Data Room", () => {
    expect(
      resolveHistorySourceLabel({
        source: "data_room",
        action: "UPLOAD",
        dataRoomAction: "UPLOADED",
      }),
    ).toBe("Data Room");

    expect(
      resolveHistorySourceLabel({
        source: "data_room",
        action: "UPDATE",
        dataRoomAction: "RENAMED",
      }),
    ).toBe("Data Room");
  });

  it("labels org AuditLog CRUD as Organization", () => {
    expect(
      resolveHistorySourceLabel({
        source: "audit_log",
        action: "UPDATE",
      }),
    ).toBe("Organization");
  });

  it("labels AuditLog agent runs as Intelligence", () => {
    expect(
      resolveHistorySourceLabel({
        source: "audit_log",
        action: "AGENT_RUN",
      }),
    ).toBe("Intelligence");
  });
});
