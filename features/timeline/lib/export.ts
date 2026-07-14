import type { TimelineEventView } from "@/features/timeline/lib/timeline-events";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function timelineEventsToCsv(events: TimelineEventView[]): string {
  const header = [
    "id",
    "title",
    "description",
    "eventDate",
    "category",
    "pinned",
    "isManual",
    "documentId",
    "documentName",
  ];
  const rows = events.map((event) =>
    [
      event.id,
      event.title,
      event.description ?? "",
      event.eventDate,
      event.category,
      String(event.pinned),
      String(event.isManual),
      event.documentId ?? "",
      event.documentName ?? "",
    ]
      .map((cell) => csvEscape(cell))
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcsDate(iso: string): string {
  const date = new Date(iso);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function timelineEventsToIcs(events: TimelineEventView[], calendarName: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NexusIQ//Timeline//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
  ];

  for (const event of events) {
    const day = toIcsDate(event.eventDate);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@nexusiq`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `SUMMARY:${icsEscape(event.title)}`,
    );
    if (event.description) {
      lines.push(`DESCRIPTION:${icsEscape(event.description)}`);
    }
    lines.push(`CATEGORIES:${event.category}`, "END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
