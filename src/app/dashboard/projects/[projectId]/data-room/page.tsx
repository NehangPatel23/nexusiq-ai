import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { DataRoomView } from "@/features/data-room/components/data-room-view";
import { listDocuments } from "@/features/data-room/lib/documents";
import { buildFolderTree, listFolders } from "@/features/data-room/lib/folders";
import {
  canDeleteDocuments,
  canManageDeletedDocuments,
  canUploadDocuments,
} from "@/features/data-room/lib/roles";
import { getDeletedRetentionDays, purgeExpiredDeletedItems } from "@/features/data-room/lib/retention";
import type { DataRoomDocument, DataRoomFolderNode } from "@/features/data-room/lib/types";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

function toClientFolders(
  folders: Awaited<ReturnType<typeof listFolders>>,
): DataRoomFolderNode[] {
  return JSON.parse(JSON.stringify(buildFolderTree(folders))) as DataRoomFolderNode[];
}

function toClientDocuments(
  documents: Awaited<ReturnType<typeof listDocuments>>,
): DataRoomDocument[] {
  return JSON.parse(JSON.stringify(documents)) as DataRoomDocument[];
}

export default async function DataRoomPage({ params }: PageProps) {
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

  const [folders, documents] = await Promise.all([
    listFolders(projectId),
    listDocuments(projectId, { folderId: "all" }),
  ]);

  const canManageDeleted = canManageDeletedDocuments(membership.role);
  if (canManageDeleted) {
    await purgeExpiredDeletedItems(projectId);
  }

  const retentionDays = getDeletedRetentionDays();

  return (
    <Suspense
      fallback={
        <div className="space-y-3" aria-busy="true" aria-label="Loading data room">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      }
    >
      <DataRoomView
        projectId={projectId}
        initialFolders={toClientFolders(folders)}
        initialDocuments={toClientDocuments(documents)}
        canUpload={canUploadDocuments(membership.role)}
        canDelete={canDeleteDocuments(membership.role)}
        canManageDeleted={canManageDeleted}
        retentionDays={retentionDays}
      />
    </Suspense>
  );
}
