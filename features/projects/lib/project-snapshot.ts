import type { ProjectType } from "@prisma/client";

import { getDefaultAgentFromMetadata } from "./default-agents";
import type { ProjectWithWorkspace } from "./projects";

export interface ProjectSnapshot {
  id: string;
  name: string;
  description: string | null;
  type: ProjectType;
  targetCompany: string | null;
  dealStatus: string | null;
  tags: string[];
  metadata: unknown;
  pinned: boolean;
  workspace: {
    name: string;
    organization: { name: string };
  };
}

export function toProjectSnapshot(project: ProjectWithWorkspace): ProjectSnapshot {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    type: project.type,
    targetCompany: project.targetCompany,
    dealStatus: project.dealStatus,
    tags: project.tags,
    metadata: project.metadata,
    pinned: project.pinned,
    workspace: {
      name: project.workspace.name,
      organization: { name: project.workspace.organization.name },
    },
  };
}

export function getSnapshotDefaultAgent(snapshot: ProjectSnapshot) {
  return getDefaultAgentFromMetadata(snapshot.metadata);
}
