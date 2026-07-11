import { notFound } from "next/navigation";

import { SharedDataRoomView } from "@/features/data-room/components/shared-data-room-view";
import { getActiveShareByToken } from "@/features/data-room/lib/shares";
import { listDocuments } from "@/features/data-room/lib/documents";
import { buildFolderTree, listFolders } from "@/features/data-room/lib/folders";
import type { DataRoomDocument, DataRoomFolderNode } from "@/features/data-room/lib/types";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedDataRoomPage({ params }: PageProps) {
  const { token } = await params;
  const result = await getActiveShareByToken(token);

  if ("error" in result) {
    notFound();
  }

  const { share } = result;
  const projectId = share.projectId;

  const [folders, documents] = await Promise.all([
    listFolders(projectId),
    listDocuments(projectId, { folderId: "all" }),
  ]);

  const initialFolders = JSON.parse(JSON.stringify(buildFolderTree(folders))) as DataRoomFolderNode[];
  const initialDocuments = JSON.parse(JSON.stringify(documents)) as DataRoomDocument[];

  return (
    <SharedDataRoomView
      token={token}
      projectName={share.project.name}
      workspaceName={share.project.workspace.name}
      shareLabel={share.label}
      initialFolders={initialFolders}
      initialDocuments={initialDocuments}
    />
  );
}
