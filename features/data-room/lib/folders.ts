import { prisma } from "@/lib/db";

import type { CreateFolderInput, UpdateFolderInput } from "../schemas";
import { buildFolderPath, sanitizePathSegment } from "./paths";

export type FolderErrorCode = "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT";

export type FolderServiceError = {
  error: FolderErrorCode;
  message: string;
};

export type FolderNode = {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  children: FolderNode[];
};

export async function listFolders(projectId: string) {
  return prisma.folder.findMany({
    where: { projectId, deletedAt: null },
    orderBy: [{ path: "asc" }],
  });
}

export function buildFolderTree(
  folders: Array<{
    id: string;
    projectId: string;
    parentId: string | null;
    name: string;
    path: string;
    createdAt: Date;
    updatedAt: Date;
  }>,
): FolderNode[] {
  const byId = new Map<string, FolderNode>();
  for (const folder of folders) {
    byId.set(folder.id, { ...folder, children: [] });
  }

  const roots: FolderNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getFolderById(folderId: string) {
  return prisma.folder.findFirst({
    where: { id: folderId, deletedAt: null },
  });
}

export async function createFolder(
  projectId: string,
  input: CreateFolderInput,
): Promise<{ folder: Awaited<ReturnType<typeof getFolderById>> } | FolderServiceError> {
  const name = sanitizePathSegment(input.name);
  if (!name) {
    return { error: "VALIDATION_ERROR", message: "Folder name is required" };
  }

  let parentPath: string | null = null;
  if (input.parentId) {
    const parent = await getFolderById(input.parentId);
    if (!parent || parent.projectId !== projectId) {
      return { error: "NOT_FOUND", message: "Parent folder not found" };
    }
    parentPath = parent.path;
  }

  const path = buildFolderPath(parentPath, name);

  const existing = await prisma.folder.findFirst({
    where: {
      projectId,
      path,
      deletedAt: null,
    },
  });
  if (existing) {
    return { error: "CONFLICT", message: "A folder with this name already exists here" };
  }

  const folder = await prisma.folder.create({
    data: {
      projectId,
      parentId: input.parentId ?? null,
      name,
      path,
    },
  });

  return { folder };
}

export async function updateFolder(
  folderId: string,
  input: UpdateFolderInput,
): Promise<{ folder: NonNullable<Awaited<ReturnType<typeof getFolderById>>> } | FolderServiceError> {
  const folder = await getFolderById(folderId);
  if (!folder) {
    return { error: "NOT_FOUND", message: "Folder not found" };
  }

  let parentId = folder.parentId;
  let parentPath: string | null = null;

  if (input.parentId !== undefined) {
    if (input.parentId === folderId) {
      return { error: "VALIDATION_ERROR", message: "Folder cannot be its own parent" };
    }
    if (input.parentId) {
      const parent = await getFolderById(input.parentId);
      if (!parent || parent.projectId !== folder.projectId) {
        return { error: "NOT_FOUND", message: "Parent folder not found" };
      }
      if (parent.path.startsWith(folder.path + "/")) {
        return { error: "VALIDATION_ERROR", message: "Cannot move a folder into its descendant" };
      }
      parentId = parent.id;
      parentPath = parent.path;
    } else {
      parentId = null;
      parentPath = null;
    }
  } else if (folder.parentId) {
    const parent = await getFolderById(folder.parentId);
    parentPath = parent?.path ?? null;
  }

  const name = input.name !== undefined ? sanitizePathSegment(input.name) : folder.name;
  if (!name) {
    return { error: "VALIDATION_ERROR", message: "Folder name is required" };
  }

  const newPath = buildFolderPath(parentPath, name);
  const oldPath = folder.path;

  if (newPath !== oldPath) {
    const conflict = await prisma.folder.findFirst({
      where: {
        projectId: folder.projectId,
        path: newPath,
        deletedAt: null,
        NOT: { id: folderId },
      },
    });
    if (conflict) {
      return { error: "CONFLICT", message: "A folder with this name already exists here" };
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.folder.update({
      where: { id: folderId },
      data: {
        name,
        parentId,
        path: newPath,
      },
    });

    if (newPath !== oldPath) {
      const descendants = await tx.folder.findMany({
        where: {
          projectId: folder.projectId,
          deletedAt: null,
          path: { startsWith: `${oldPath}/` },
        },
      });

      for (const descendant of descendants) {
        const suffix = descendant.path.slice(oldPath.length);
        await tx.folder.update({
          where: { id: descendant.id },
          data: { path: `${newPath}${suffix}` },
        });
      }
    }

    return result;
  });

  return { folder: updated };
}

export async function softDeleteFolder(
  folderId: string,
): Promise<{ deleted: true } | FolderServiceError> {
  const folder = await getFolderById(folderId);
  if (!folder) {
    return { error: "NOT_FOUND", message: "Folder not found" };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.folder.updateMany({
      where: {
        projectId: folder.projectId,
        deletedAt: null,
        OR: [{ id: folderId }, { path: { startsWith: `${folder.path}/` } }],
      },
      data: { deletedAt: now },
    });

    const folderIds = await tx.folder.findMany({
      where: {
        projectId: folder.projectId,
        OR: [{ id: folderId }, { path: { startsWith: `${folder.path}/` } }],
      },
      select: { id: true },
    });

    await tx.document.updateMany({
      where: {
        projectId: folder.projectId,
        folderId: { in: folderIds.map((f) => f.id) },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });
  });

  return { deleted: true };
}

export async function getDeletedFolderById(folderId: string) {
  return prisma.folder.findFirst({
    where: { id: folderId, deletedAt: { not: null } },
  });
}

export async function listDeletedFolders(projectId: string) {
  return prisma.folder.findMany({
    where: { projectId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
}

/** Top-level deleted folders only (not nested under another deleted folder). */
export async function listDeletedRootFolders(projectId: string) {
  const all = await listDeletedFolders(projectId);
  const paths = new Set(all.map((f) => f.path));
  return all.filter((folder) => {
    const parentPath = folder.path.includes("/")
      ? folder.path.slice(0, folder.path.lastIndexOf("/"))
      : null;
    return !parentPath || !paths.has(parentPath);
  });
}

export async function restoreFolder(
  folderId: string,
): Promise<{ folder: NonNullable<Awaited<ReturnType<typeof getFolderById>>> } | FolderServiceError> {
  const folder = await getDeletedFolderById(folderId);
  if (!folder) {
    return { error: "NOT_FOUND", message: "Deleted folder not found" };
  }

  let parentId = folder.parentId;
  if (parentId) {
    const parent = await getFolderById(parentId);
    if (!parent) {
      parentId = null;
    }
  }

  const parentPath = parentId
    ? (await prisma.folder.findFirst({ where: { id: parentId } }))?.path ?? null
    : null;
  const newPath = buildFolderPath(parentPath, folder.name);

  const conflict = await prisma.folder.findFirst({
    where: {
      projectId: folder.projectId,
      path: newPath,
      deletedAt: null,
      NOT: { id: folderId },
    },
  });
  if (conflict) {
    return {
      error: "CONFLICT",
      message: "An active folder with this name already exists at this location",
    };
  }

  const oldPath = folder.path;

  await prisma.$transaction(async (tx) => {
    const descendants = await tx.folder.findMany({
      where: {
        projectId: folder.projectId,
        OR: [{ id: folderId }, { path: { startsWith: `${oldPath}/` } }],
      },
    });

    const folderIds = descendants.map((f) => f.id);

    for (const descendant of descendants) {
      const suffix = descendant.path.slice(oldPath.length);
      const restoredPath = `${newPath}${suffix}`;
      await tx.folder.update({
        where: { id: descendant.id },
        data: {
          deletedAt: null,
          path: restoredPath,
          parentId: descendant.id === folderId ? parentId : descendant.parentId,
        },
      });
    }

    await tx.document.updateMany({
      where: {
        projectId: folder.projectId,
        folderId: { in: folderIds },
        deletedAt: { not: null },
      },
      data: { deletedAt: null },
    });
  });

  const restored = await getFolderById(folderId);
  if (!restored) {
    return { error: "NOT_FOUND", message: "Folder could not be restored" };
  }

  return { folder: restored };
}

export async function permanentlyDeleteFolder(
  folderId: string,
): Promise<{ deleted: true } | FolderServiceError> {
  const folder = await getDeletedFolderById(folderId);
  if (!folder) {
    return { error: "NOT_FOUND", message: "Deleted folder not found" };
  }

  const tree = await prisma.folder.findMany({
    where: {
      projectId: folder.projectId,
      OR: [{ id: folderId }, { path: { startsWith: `${folder.path}/` } }],
    },
    select: { id: true },
  });
  const folderIds = tree.map((f) => f.id);

  const documents = await prisma.document.findMany({
    where: { projectId: folder.projectId, folderId: { in: folderIds } },
    select: { id: true },
  });

  const { permanentlyDeleteDocument } = await import("./documents");
  for (const doc of documents) {
    await permanentlyDeleteDocument(doc.id);
  }

  await prisma.folder.deleteMany({
    where: { id: { in: folderIds } },
  });

  return { deleted: true };
}

/**
 * Ensure a nested folder path exists under a project, creating missing folders.
 * Returns the leaf folder id (or null for root).
 */
export async function ensureFolderPath(
  projectId: string,
  segments: string[],
  parentId: string | null = null,
): Promise<string | null> {
  if (segments.length === 0) {
    return parentId;
  }

  let currentParentId = parentId;
  let currentPath: string | null = null;

  if (currentParentId) {
    const parent = await getFolderById(currentParentId);
    if (!parent || parent.projectId !== projectId) {
      throw new Error("Parent folder not found");
    }
    currentPath = parent.path;
  }

  for (const rawSegment of segments) {
    const name = sanitizePathSegment(rawSegment);
    if (!name) continue;

    const path = buildFolderPath(currentPath, name);
    let folder = await prisma.folder.findFirst({
      where: { projectId, path, deletedAt: null },
    });

    if (!folder) {
      folder = await prisma.folder.create({
        data: {
          projectId,
          parentId: currentParentId,
          name,
          path,
        },
      });
    }

    currentParentId = folder.id;
    currentPath = folder.path;
  }

  return currentParentId;
}
