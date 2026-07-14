import type { FindingSeverity, ProjectType } from "@prisma/client";

import { matchChecklistAgainstDocuments } from "@/features/missing/lib/match-checklist";
import {
  createMissingItem,
  listMissingItems,
  type MissingItemView,
} from "@/features/missing/lib/missing-items";
import { polishedFollowUpPayloadSchema } from "@/features/missing/schemas";
import type { ComplianceAgentOutput } from "@/lib/ai/agents/types";
import { getOllamaClient, type OllamaClient } from "@/lib/ai/ollama-client";
import { prisma } from "@/lib/db";

const FOLLOW_UP_POLISH_PROMPT = `Rewrite each follow-up request to be concise, professional, and specific.
Return JSON array: [{ "title": string, "followUpText": string }]
Keep the same titles. Do not invent documents.`;

export type ScanMissingResult = {
  created: number;
  skipped: number;
  closedResolved: number;
  items: MissingItemView[];
  checklist: Array<{
    title: string;
    category: string;
    expectedType: string;
    found: boolean;
    matchedDocumentIds: string[];
    matchedDocuments: Array<{ id: string; name: string }>;
    framework: string | null;
    severity: FindingSeverity;
    expectedFolderPath: string | null;
  }>;
  message?: string;
};

function checklistKey(title: string, category: string): string {
  return `${category.trim().toLowerCase()}|${title.trim().toLowerCase()}`;
}

async function loadFrameworkGaps(projectId: string): Promise<
  Array<{
    framework: string;
    requirement: string;
    status: string;
  }>
> {
  const run = await prisma.agentRun.findFirst({
    where: { projectId, agentType: "COMPLIANCE", status: "COMPLETED" },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
    select: { output: true },
  });
  if (!run?.output || typeof run.output !== "object") return [];
  const output = run.output as ComplianceAgentOutput;
  return (output.frameworkGaps ?? [])
    .filter((gap) => gap.status === "missing" || gap.status === "partial")
    .map((gap) => ({
      framework: gap.framework,
      requirement: gap.requirement,
      status: gap.status,
    }));
}

async function polishFollowUps(params: {
  items: Array<{ title: string; followUpText: string }>;
  ollama: Pick<OllamaClient, "healthCheck" | "chat">;
}): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (params.items.length === 0) return map;

  const health = await params.ollama.healthCheck();
  if (!health.ok) return map;

  try {
    const raw = await params.ollama.chat(
      [
        { role: "system", content: FOLLOW_UP_POLISH_PROMPT },
        {
          role: "user",
          content: JSON.stringify(params.items),
        },
      ],
      { format: "json", maxTokens: 2048, timeoutMs: 45_000 },
    );

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (!match) return map;
      json = JSON.parse(match[0]);
    }

    const parsed = polishedFollowUpPayloadSchema.safeParse(json);
    if (!parsed.success) return map;
    const rows = Array.isArray(parsed.data) ? parsed.data : parsed.data.items;
    for (const row of rows) {
      if (row.title) map.set(row.title.trim().toLowerCase(), row.followUpText);
    }
  } catch {
    // Non-blocking — keep template follow-up text.
  }

  return map;
}

export async function scanMissingInfo(params: {
  projectId: string;
  force?: boolean;
  polishFollowUps?: boolean;
  ollama?: Pick<OllamaClient, "healthCheck" | "chat">;
}): Promise<ScanMissingResult> {
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, deletedAt: null },
    select: { id: true, type: true },
  });
  if (!project) {
    return {
      created: 0,
      skipped: 0,
      closedResolved: 0,
      items: [],
      checklist: [],
      message: "Project not found.",
    };
  }

  const documents = await prisma.document.findMany({
    where: { projectId: params.projectId, deletedAt: null, status: "READY" },
    select: { id: true, name: true, classification: true, tags: true },
  });

  const matches = matchChecklistAgainstDocuments({
    projectType: project.type as ProjectType,
    documents,
  });

  const checklist = matches.map((row) => ({
    title: row.item.title,
    category: row.item.category,
    expectedType: row.item.expectedType,
    found: row.found,
    matchedDocumentIds: row.matchedDocumentIds,
    matchedDocuments: row.matchedDocuments,
    framework: row.item.framework ?? null,
    severity: row.item.severity as FindingSeverity,
    expectedFolderPath: row.item.expectedFolderPath ?? null,
  }));

  const gaps = matches.filter((row) => !row.found);

  const frameworkGaps = await loadFrameworkGaps(params.projectId);
  const extraGaps = frameworkGaps
    .filter((gap) => {
      // Avoid duplicating checklist titles that already cover the requirement.
      const req = gap.requirement.toLowerCase();
      return !gaps.some(
        (g) =>
          g.item.title.toLowerCase().includes(req) ||
          req.includes(g.item.title.toLowerCase()),
      );
    })
    .map((gap) => ({
      category: "Compliance framework",
      title: `${gap.framework}: ${gap.requirement}`,
      description: `Compliance agent marked this requirement as ${gap.status}.`,
      expectedType: "COMPLIANCE" as const,
      framework: gap.framework,
      severity: "HIGH" as FindingSeverity,
      followUpText: `Please provide evidence for ${gap.framework} requirement: ${gap.requirement}.`,
    }));

  const existing = await listMissingItems({ projectId: params.projectId });
  let existingByKey = new Map(
    existing.map((row) => [checklistKey(row.title, row.category), row]),
  );

  let closedResolved = 0;
  if (params.force) {
    // Items that are now found → mark RESOLVED (keep NOT_APPLICABLE / REQUESTED history).
    for (const row of matches.filter((m) => m.found)) {
      const key = checklistKey(row.item.title, row.item.category);
      const existingRow = existingByKey.get(key);
      if (existingRow && (existingRow.status === "OPEN" || existingRow.status === "REQUESTED")) {
        await prisma.missingItem.update({
          where: { id: existingRow.id },
          data: { status: "RESOLVED" },
        });
        closedResolved += 1;
      }
    }
    // Drop prior OPEN gaps that will be recreated fresh.
    await prisma.missingItem.deleteMany({
      where: { projectId: params.projectId, status: "OPEN" },
    });
    const refreshed = await listMissingItems({ projectId: params.projectId });
    existingByKey = new Map(
      refreshed.map((row) => [checklistKey(row.title, row.category), row]),
    );
  }

  const candidates = [
    ...gaps.map((row) => ({
      category: row.item.category,
      title: row.item.title,
      description: row.item.description,
      expectedType: row.item.expectedType,
      framework: row.item.framework ?? null,
      severity: row.item.severity as FindingSeverity,
      followUpText: row.item.followUpTemplate,
    })),
    ...extraGaps,
  ];

  let polished = new Map<string, string>();
  if (params.polishFollowUps !== false && candidates.length > 0) {
    const ollama = params.ollama ?? getOllamaClient();
    polished = await polishFollowUps({
      items: candidates.map((c) => ({ title: c.title, followUpText: c.followUpText })),
      ollama,
    });
  }

  const createdItems: MissingItemView[] = [];
  let skipped = 0;

  for (const candidate of candidates) {
    const key = checklistKey(candidate.title, candidate.category);
    const prior = existingByKey.get(key);
    if (prior) {
      // Preserve REQUESTED / NOT_APPLICABLE / RESOLVED; only recreate OPEN on force.
      if (prior.status !== "OPEN") {
        skipped += 1;
        continue;
      }
      if (!params.force) {
        skipped += 1;
        continue;
      }
    }

    const followUp =
      polished.get(candidate.title.trim().toLowerCase()) ?? candidate.followUpText;

    const item = await createMissingItem({
      project: { connect: { id: params.projectId } },
      category: candidate.category,
      title: candidate.title,
      description: candidate.description,
      expectedType: candidate.expectedType,
      framework: candidate.framework,
      followUpText: followUp,
      severity: candidate.severity,
      status: "OPEN",
    });
    createdItems.push(item);
  }

  const items = await listMissingItems({ projectId: params.projectId });

  return {
    created: createdItems.length,
    skipped,
    closedResolved,
    items,
    checklist,
    message:
      documents.length === 0
        ? "No READY documents yet — upload and process documents in the data room."
        : candidates.length === 0
          ? "Checklist complete — no missing documents detected."
          : undefined,
  };
}
