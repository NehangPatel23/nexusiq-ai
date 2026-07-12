import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { listDocuments, mapDocumentForApi } from "@/features/data-room/lib/documents";
import { listFolders } from "@/features/data-room/lib/folders";
import type { DataRoomDocument } from "@/features/data-room/lib/types";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { listSavedSearches } from "@/features/search/lib/saved-searches";
import { SearchPage } from "@/features/search/components/search-page";
import { getProjectById } from "@/features/projects/lib/projects";
import { getOllamaClient, isOllamaConfigured } from "@/lib/ai/ollama-client";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function getOllamaStatus(): Promise<"connected" | "unreachable" | "not_configured"> {
  if (!isOllamaConfigured()) return "not_configured";
  const health = await getOllamaClient().healthCheck();
  return health.ok ? "connected" : "unreachable";
}

export default async function ProjectSearchPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    notFound();
  }

  const membership = await getOrganizationMembership(
    project.workspace.organizationId,
    session.user.id,
  );
  if (!membership) {
    redirect("/dashboard/projects");
  }

  const [folders, documents, savedSearches, ollamaStatus] = await Promise.all([
    listFolders(projectId),
    listDocuments(projectId, { folderId: "all" }),
    listSavedSearches(projectId, session.user.id),
    getOllamaStatus(),
  ]);

  const clientDocuments = documents.map((doc) =>
    JSON.parse(JSON.stringify(mapDocumentForApi(doc))),
  ) as DataRoomDocument[];

  return (
    <Suspense
      fallback={
        <div className="space-y-3" aria-busy="true" aria-label="Loading search">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      }
    >
      <SearchPage
        projectId={projectId}
        initialSavedSearches={savedSearches}
        folders={folders.map((folder) => ({ id: folder.id, path: folder.path }))}
        documents={clientDocuments}
        ollamaStatus={ollamaStatus}
      />
    </Suspense>
  );
}
