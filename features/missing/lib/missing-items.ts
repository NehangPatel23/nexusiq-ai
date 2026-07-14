import type { MissingItemStatus, FindingSeverity, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type MissingItemView = {
  id: string;
  projectId: string;
  category: string;
  title: string;
  description: string;
  expectedType: string | null;
  framework: string | null;
  followUpText: string | null;
  severity: FindingSeverity | null;
  status: MissingItemStatus;
  createdAt: string;
  updatedAt: string;
};

function toView(row: {
  id: string;
  projectId: string;
  category: string;
  title: string;
  description: string;
  expectedType: string | null;
  framework: string | null;
  followUpText: string | null;
  severity: FindingSeverity | null;
  status: MissingItemStatus;
  createdAt: Date;
  updatedAt: Date;
}): MissingItemView {
  return {
    id: row.id,
    projectId: row.projectId,
    category: row.category,
    title: row.title,
    description: row.description,
    expectedType: row.expectedType,
    framework: row.framework,
    followUpText: row.followUpText,
    severity: row.severity,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMissingItems(params: {
  projectId: string;
  status?: MissingItemStatus;
}): Promise<MissingItemView[]> {
  const rows = await prisma.missingItem.findMany({
    where: {
      projectId: params.projectId,
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
  });
  const rank: Record<FindingSeverity, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  return rows
    .map(toView)
    .sort(
      (a, b) =>
        (a.severity ? rank[a.severity] : 4) - (b.severity ? rank[b.severity] : 4) ||
        b.createdAt.localeCompare(a.createdAt),
    );
}

export async function countOpenMissingItems(projectId: string): Promise<number> {
  return prisma.missingItem.count({
    where: { projectId, status: { in: ["OPEN", "REQUESTED"] } },
  });
}

export async function createMissingItem(data: Prisma.MissingItemCreateInput) {
  const row = await prisma.missingItem.create({ data });
  return toView(row);
}

export async function updateMissingItemStatus(params: {
  id: string;
  status?: MissingItemStatus;
  severity?: FindingSeverity | null;
}) {
  if (params.status === undefined && params.severity === undefined) {
    throw new Error("Provide status and/or severity");
  }
  return prisma.missingItem.update({
    where: { id: params.id },
    data: {
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(params.severity !== undefined ? { severity: params.severity } : {}),
    },
    select: {
      id: true,
      status: true,
      severity: true,
      title: true,
      projectId: true,
      updatedAt: true,
    },
  });
}

export function missingItemsToMarkdown(
  items: MissingItemView[],
  projectName: string,
): string {
  const lines = [
    `# Follow-up document requests — ${projectName}`,
    "",
    `Generated ${new Date().toISOString().slice(0, 10)}`,
    "",
  ];
  for (const item of items) {
    lines.push(`## ${item.title}`);
    lines.push("");
    lines.push(`- Category: ${item.category}`);
    if (item.framework) lines.push(`- Framework: ${item.framework}`);
    if (item.severity) lines.push(`- Severity: ${item.severity}`);
    lines.push(`- Status: ${item.status}`);
    lines.push("");
    lines.push(item.followUpText ?? item.description);
    lines.push("");
  }
  return lines.join("\n");
}

export function missingItemsToCsv(items: MissingItemView[]): string {
  const escape = (value: string) => {
    if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const header = [
    "id",
    "category",
    "title",
    "description",
    "expectedType",
    "framework",
    "severity",
    "status",
    "followUpText",
  ];
  const rows = items.map((item) =>
    [
      item.id,
      item.category,
      item.title,
      item.description,
      item.expectedType ?? "",
      item.framework ?? "",
      item.severity ?? "",
      item.status,
      item.followUpText ?? "",
    ]
      .map((cell) => escape(cell))
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
