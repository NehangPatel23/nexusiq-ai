import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MissingPageClient } from "@/features/missing/components/missing-page";
import { getChecklistForProjectType } from "@/features/missing/lib/checklists";
import { matchChecklistAgainstDocuments } from "@/features/missing/lib/match-checklist";
import { listMissingItems } from "@/features/missing/lib/missing-items";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function MissingPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const membership = await getOrganizationMembership(
    project.workspace.organizationId,
    session.user.id,
  );
  if (!membership) redirect("/dashboard/projects");

  const [items, documents] = await Promise.all([
    listMissingItems({ projectId }),
    prisma.document.findMany({
      where: { projectId, deletedAt: null, status: "READY" },
      select: { id: true, name: true, classification: true, tags: true },
    }),
  ]);

  const matches = matchChecklistAgainstDocuments({
    projectType: project.type,
    documents,
  });

  // If never scanned, still show expected checklist vs uploaded.
  const checklist =
    matches.length > 0
      ? matches.map((row) => ({
          title: row.item.title,
          category: row.item.category,
          expectedType: row.item.expectedType,
          found: row.found,
          matchedDocumentIds: row.matchedDocumentIds,
          matchedDocuments: row.matchedDocuments,
          framework: row.item.framework ?? null,
          severity: row.item.severity,
          expectedFolderPath: row.item.expectedFolderPath ?? null,
        }))
      : getChecklistForProjectType(project.type).map((item) => ({
          title: item.title,
          category: item.category,
          expectedType: item.expectedType,
          found: false,
          matchedDocumentIds: [] as string[],
          matchedDocuments: [] as Array<{ id: string; name: string }>,
          framework: item.framework ?? null,
          severity: item.severity,
          expectedFolderPath: item.expectedFolderPath ?? null,
        }));

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading missing info…</div>}>
      <MissingPageClient
        projectId={projectId}
        projectName={project.name}
        projectType={project.type}
        initialItems={JSON.parse(JSON.stringify(items))}
        initialChecklist={JSON.parse(JSON.stringify(checklist))}
        readyDocumentCount={documents.length}
      />
    </Suspense>
  );
}
