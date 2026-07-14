import { describe, expect, it } from "vitest";

import { timelineEventsToCsv, timelineEventsToIcs } from "@/features/timeline/lib/export";
import type { TimelineEventView } from "@/features/timeline/lib/timeline-events";

const sample: TimelineEventView = {
  id: "evt-1",
  projectId: "proj-1",
  title: 'Series "A" closed',
  description: "Line1\nLine2",
  eventDate: "2024-03-15T12:00:00.000Z",
  category: "FUNDING",
  sourceChunkId: null,
  documentId: "doc-1",
  documentName: "deck.pdf",
  isManual: false,
  pinned: true,
  deletedAt: null,
  createdAt: "2024-03-16T00:00:00.000Z",
  updatedAt: "2024-03-16T00:00:00.000Z",
};

describe("timeline export", () => {
  it("escapes CSV fields", () => {
    const csv = timelineEventsToCsv([sample]);
    expect(csv).toContain('"Series ""A"" closed"');
    expect(csv).toContain("FUNDING");
    expect(csv.startsWith("id,title,")).toBe(true);
    expect(csv).toContain('"Line1\nLine2"');
  });

  it("builds VEVENT ICS blocks", () => {
    const ics = timelineEventsToIcs([sample], "Demo Timeline");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Series \"A\" closed");
    expect(ics).toContain("DTSTART;VALUE=DATE:20240315");
    expect(ics).toContain("END:VCALENDAR");
  });
});
