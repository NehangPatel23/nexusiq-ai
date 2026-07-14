import type { RiskRegisterRow } from "@/features/reports/lib/assemble-shared";

export async function exportRiskRegisterXlsx(params: {
  rows: RiskRegisterRow[];
  projectName: string;
  reportTitle?: string;
  includeSummarySheet?: boolean;
}): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NexusIQ-AI";
  workbook.created = new Date();

  if (params.includeSummarySheet !== false) {
    const summary = workbook.addWorksheet("Summary");
    summary.addRow(["NexusIQ Diligence Export"]);
    summary.getRow(1).font = { bold: true, size: 14 };
    summary.addRow(["Project", params.projectName]);
    summary.addRow(["Report", params.reportTitle ?? "Findings export"]);
    summary.addRow(["Generated at", new Date().toISOString()]);
    summary.addRow(["Open findings", params.rows.length]);

    const bySeverity = new Map<string, number>();
    for (const row of params.rows) {
      bySeverity.set(row.severity, (bySeverity.get(row.severity) ?? 0) + 1);
    }
    summary.addRow([]);
    summary.addRow(["Severity", "Count"]);
    summary.getRow(summary.rowCount).font = { bold: true };
    for (const severity of ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]) {
      if (bySeverity.has(severity)) {
        summary.addRow([severity, bySeverity.get(severity)]);
      }
    }
    summary.getColumn(1).width = 18;
    summary.getColumn(2).width = 48;
  }

  const sheet = workbook.addWorksheet("Findings", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Severity", key: "severity", width: 12 },
    { header: "Category", key: "category", width: 18 },
    { header: "Agent", key: "agent", width: 14 },
    { header: "Title", key: "title", width: 36 },
    { header: "Description", key: "description", width: 48 },
    { header: "How to close", key: "remediation", width: 48 },
    { header: "Citation", key: "citation", width: 28 },
    { header: "Status", key: "status", width: 14 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8EEF7" },
  };

  if (params.rows.length === 0) {
    sheet.addRow({
      severity: "—",
      category: "—",
      agent: "—",
      title: "No open findings",
      description: "",
      remediation: "",
      citation: "—",
      status: "—",
    });
  } else {
    for (const row of params.rows) {
      const excelRow = sheet.addRow({
        severity: row.severity,
        category: row.category,
        agent: row.agent,
        title: row.title,
        description: row.description,
        remediation: row.remediation,
        citation: row.citation,
        status: row.status,
      });
      if (row.severity === "CRITICAL" || row.severity === "HIGH") {
        excelRow.getCell("severity").font = { color: { argb: "FFB42318" }, bold: true };
      }
    }
  }

  const meta = workbook.addWorksheet("Meta");
  meta.addRow(["Project", params.projectName]);
  meta.addRow(["Generated at", new Date().toISOString()]);
  meta.addRow(["Row count", params.rows.length]);
  meta.addRow(["Exporter", "NexusIQ-AI (local)"]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function xlsxContentType(): string {
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

export function xlsxFileName(title: string, reportId: string): string {
  const safe = title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) || "findings";
  return `${safe}-${reportId.slice(0, 8)}.xlsx`;
}
