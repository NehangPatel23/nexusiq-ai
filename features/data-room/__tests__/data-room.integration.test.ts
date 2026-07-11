import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { createProject } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";
import { getStorage, resetStorageAdapter } from "@/lib/storage";

import {
  listDocuments,
  listDeletedDocuments,
  permanentlyDeleteDocument,
  reprocessDocument,
  restoreDocument,
  softDeleteDocument,
  uploadDocument,
} from "../lib/documents";
import {
  buildFolderTree,
  createFolder,
  listFolders,
  softDeleteFolder,
  updateFolder,
} from "../lib/folders";

const ownerEmail = `data-room-owner-${Date.now()}@example.com`;

let organizationId = "";
let projectId = "";
let ownerId = "";
let storageDir = "";

describe("data-room integration", () => {
  beforeAll(async () => {
    storageDir = await mkdtemp(path.join(os.tmpdir(), "nexusiq-storage-"));
    process.env.STORAGE_PATH = storageDir;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetStorageAdapter();

    const owner = await createUser({
      name: "Data Room Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });
    ownerId = owner.id;

    const organization = await createOrganization(owner.id, {
      name: "Data Room Integration Org",
    });
    organizationId = organization.id;

    const workspace = await createWorkspace(organizationId, {
      name: "Data Room Workspace",
    });
    expect("workspace" in workspace).toBe(true);
    if (!("workspace" in workspace)) return;

    const project = await createProject(workspace.workspace.id, {
      name: "Data Room Project",
      type: "MA",
    });
    expect("project" in project).toBe(true);
    if ("project" in project) {
      projectId = project.project.id;
    }
  });

  afterAll(async () => {
    await prisma.documentVersion.deleteMany({
      where: { document: { projectId } },
    });
    await prisma.document.deleteMany({ where: { projectId } });
    await prisma.folder.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.workspace.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { email: ownerEmail } });
    await prisma.$disconnect();
    await rm(storageDir, { recursive: true, force: true });
    resetStorageAdapter();
  });

  it("creates nested folders and returns a tree", async () => {
    const root = await createFolder(projectId, { name: "Financials" });
    expect("folder" in root).toBe(true);
    if (!("folder" in root) || !root.folder) return;

    const child = await createFolder(projectId, {
      name: "Q1",
      parentId: root.folder.id,
    });
    expect("folder" in child).toBe(true);
    if (!("folder" in child) || !child.folder) return;

    expect(child.folder.path).toBe("/Financials/Q1");

    const folders = await listFolders(projectId);
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.name).toBe("Q1");
  });

  it("renames a folder and updates descendant paths", async () => {
    const folders = await listFolders(projectId);
    const root = folders.find((f) => f.name === "Financials");
    expect(root).toBeTruthy();
    if (!root) return;

    const result = await updateFolder(root.id, { name: "Finance" });
    expect("folder" in result).toBe(true);

    const updated = await listFolders(projectId);
    expect(updated.some((f) => f.path === "/Finance")).toBe(true);
    expect(updated.some((f) => f.path === "/Finance/Q1")).toBe(true);
  });

  it("uploads a document to local storage with PENDING status", async () => {
    const folders = await listFolders(projectId);
    const folder = folders.find((f) => f.path === "/Finance/Q1");

    const buffer = Buffer.from("%PDF-1.4 test content");
    const result = await uploadDocument({
      organizationId,
      projectId,
      uploadedById: ownerId,
      fileName: "term-sheet.pdf",
      mimeType: "application/pdf",
      buffer,
      folderId: folder?.id ?? null,
    });

    expect("document" in result).toBe(true);
    if (!("document" in result)) return;

    expect(result.document.status).toBe("PENDING");
    expect(result.document.version).toBe(1);
    expect(result.document.type).toBe("PDF");

    const stored = await getStorage().getObject(result.document.filePath);
    expect(stored.equals(buffer)).toBe(true);

    const listed = await listDocuments(projectId, { folderId: folder?.id ?? "all" });
    expect(listed.some((d) => d.id === result.document.id)).toBe(true);
  });

  it("creates a new version when re-uploading the same name", async () => {
    const folders = await listFolders(projectId);
    const folder = folders.find((f) => f.path === "/Finance/Q1");
    const buffer = Buffer.from("%PDF-1.4 version two");
    const result = await uploadDocument({
      organizationId,
      projectId,
      uploadedById: ownerId,
      fileName: "term-sheet.pdf",
      mimeType: "application/pdf",
      buffer,
      folderId: folder?.id ?? null,
    });

    expect("document" in result).toBe(true);
    if (!("document" in result)) return;

    expect(result.document.version).toBe(2);
    expect(result.document.status).toBe("PENDING");

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: result.document.id },
      orderBy: { version: "asc" },
    });
    expect(versions).toHaveLength(2);
  });

  it("preserves relative folder paths on bulk-style upload", async () => {
    const buffer = Buffer.from("col1,col2\na,b\n");
    const result = await uploadDocument({
      organizationId,
      projectId,
      uploadedById: ownerId,
      fileName: "metrics.csv",
      mimeType: "text/csv",
      buffer,
      relativePath: "Ops/Metrics/metrics.csv",
    });

    expect("document" in result).toBe(true);
    if (!("document" in result)) return;

    expect(result.document.folder?.path).toBe("/Ops/Metrics");
    const folders = await listFolders(projectId);
    expect(folders.some((f) => f.path === "/Ops")).toBe(true);
    expect(folders.some((f) => f.path === "/Ops/Metrics")).toBe(true);
  });

  it("stubs reprocess by setting status to PENDING", async () => {
    const docs = await listDocuments(projectId);
    const doc = docs[0];
    expect(doc).toBeTruthy();
    if (!doc) return;

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "READY" },
    });

    const result = await reprocessDocument(doc.id);
    expect("document" in result).toBe(true);
    if ("document" in result) {
      expect(result.document.status).toBe("PENDING");
    }
  });

  it("soft-deletes documents and folders", async () => {
    const docs = await listDocuments(projectId);
    const doc = docs.find((d) => d.name === "metrics.csv");
    expect(doc).toBeTruthy();
    if (!doc) return;

    const deleted = await softDeleteDocument(doc.id);
    expect(deleted).toEqual({ deleted: true });

    const remaining = await listDocuments(projectId);
    expect(remaining.some((d) => d.id === doc.id)).toBe(false);

    const folders = await listFolders(projectId);
    const ops = folders.find((f) => f.path === "/Ops");
    expect(ops).toBeTruthy();
    if (!ops) return;

    const folderDeleted = await softDeleteFolder(ops.id);
    expect(folderDeleted).toEqual({ deleted: true });

    const after = await listFolders(projectId);
    expect(after.some((f) => f.path.startsWith("/Ops"))).toBe(false);
  });

  it("restores and permanently deletes soft-deleted documents", async () => {
    const docs = await listDocuments(projectId);
    const doc = docs.find((d) => d.name === "term-sheet.pdf");
    expect(doc).toBeTruthy();
    if (!doc) return;

    await softDeleteDocument(doc.id);
    const deleted = await listDeletedDocuments(projectId);
    expect(deleted.some((d) => d.id === doc.id)).toBe(true);

    const restored = await restoreDocument(doc.id);
    expect("document" in restored).toBe(true);
    if ("document" in restored) {
      expect(restored.document.deletedAt).toBeNull();
    }

    await softDeleteDocument(doc.id);
    const purged = await permanentlyDeleteDocument(doc.id);
    expect(purged).toEqual({ deleted: true });

    const remaining = await listDeletedDocuments(projectId);
    expect(remaining.some((d) => d.id === doc.id)).toBe(false);
  });
});
