import { describe, expect, it } from "vitest";

import {
  buildDocumentStorageKey,
} from "@/lib/storage";

import {
  getDocumentTypeLabel,
  isAllowedMimeType,
  mimeTypeToDocumentType,
  resolveDocumentType,
  resolveMimeType,
  validateUploadFile,
  MAX_UPLOAD_BYTES,
} from "../lib/mime";
import {
  buildFolderPath,
  sanitizePathSegment,
  splitRelativeUploadPath,
} from "../lib/paths";
import { createFolderSchema, updateDocumentTagsSchema } from "../schemas";
import {
  canDeleteDocuments,
  canManageDeletedDocuments,
  canUploadDocuments,
  canViewDataRoom,
} from "../lib/roles";
import {
  buildDuplicateMap,
  exportDocumentsCsv,
  filterDocuments,
  sortDocuments,
} from "../lib/table-utils";
import { computeChecklistProgress } from "../lib/checklist";
import { getPreviewMode, parseCsvPreview } from "../lib/preview";
import { exportAuditEventsCsv } from "../lib/audit";
import { DEFAULT_DELETED_RETENTION_DAYS, getDeletedRetentionDays } from "../lib/retention";

describe("mime validation", () => {
  it("accepts allowed MIME types", () => {
    expect(isAllowedMimeType("application/pdf")).toBe(true);
    expect(isAllowedMimeType("text/plain")).toBe(true);
    expect(isAllowedMimeType("image/png")).toBe(true);
    expect(isAllowedMimeType("application/zip")).toBe(false);
  });

  it("maps MIME types to document types", () => {
    expect(mimeTypeToDocumentType("application/pdf")).toBe("PDF");
    expect(mimeTypeToDocumentType("image/jpeg")).toBe("IMAGE");
    expect(mimeTypeToDocumentType("text/csv")).toBe("CSV");
    expect(mimeTypeToDocumentType("text/markdown")).toBe("MD");
  });

  it("resolves markdown from file name even when browser sends text/plain", () => {
    expect(resolveDocumentType("README.md", "text/plain")).toBe("MD");
    expect(
      validateUploadFile({
        fileName: "README.md",
        mimeType: "text/plain",
        size: 100,
      }),
    ).toEqual({ ok: true, mimeType: "text/markdown", type: "MD" });
  });

  it("labels legacy TXT markdown rows as MD in the UI", () => {
    expect(
      getDocumentTypeLabel({
        type: "TXT",
        mimeType: "text/plain",
        name: "README.md",
      }),
    ).toBe("MD");
    expect(
      getDocumentTypeLabel({
        type: "MD",
        mimeType: "text/markdown",
        name: "README.md",
      }),
    ).toBe("MD");
    expect(
      getDocumentTypeLabel({
        type: "TXT",
        mimeType: "text/plain",
        name: "notes.txt",
      }),
    ).toBe("TXT");
  });

  it("resolves MIME from extension when type is missing", () => {
    expect(resolveMimeType("report.PDF", "")).toBe("application/pdf");
    expect(resolveMimeType("notes.txt", null)).toBe("text/plain");
    expect(resolveMimeType("virus.exe", null)).toBeNull();
  });

  it("validates upload size and type", () => {
    expect(
      validateUploadFile({
        fileName: "a.pdf",
        mimeType: "application/pdf",
        size: 1024,
      }),
    ).toEqual({ ok: true, mimeType: "application/pdf", type: "PDF" });

    expect(
      validateUploadFile({
        fileName: "a.pdf",
        mimeType: "application/pdf",
        size: MAX_UPLOAD_BYTES + 1,
      }).ok,
    ).toBe(false);

    expect(
      validateUploadFile({
        fileName: "a.exe",
        mimeType: "application/octet-stream",
        size: 10,
      }).ok,
    ).toBe(false);
  });
});

describe("path helpers", () => {
  it("sanitizes path segments", () => {
    expect(sanitizePathSegment("  Q1 / Financials  ")).toBe("Q1 - Financials");
    expect(sanitizePathSegment("Legal\\Contracts")).toBe("Legal-Contracts");
  });

  it("builds folder paths", () => {
    expect(buildFolderPath(null, "Root")).toBe("/Root");
    expect(buildFolderPath("/", "Root")).toBe("/Root");
    expect(buildFolderPath("/Financials", "Q1")).toBe("/Financials/Q1");
  });

  it("splits relative upload paths", () => {
    expect(splitRelativeUploadPath("Financials/Q1/report.pdf")).toEqual({
      folders: ["Financials", "Q1"],
      fileName: "report.pdf",
    });
    expect(splitRelativeUploadPath("report.pdf")).toEqual({
      folders: [],
      fileName: "report.pdf",
    });
  });
});

describe("storage key generation", () => {
  it("builds organization-scoped document keys", () => {
    const key = buildDocumentStorageKey({
      organizationId: "org-1",
      projectId: "proj-1",
      documentId: "doc-1",
      version: 2,
      fileName: "Q1 Report.pdf",
    });
    expect(key).toBe(
      "organizations/org-1/projects/proj-1/documents/doc-1/v2/Q1_Report.pdf",
    );
  });
});

describe("schemas", () => {
  it("validates folder create input", () => {
    expect(createFolderSchema.safeParse({ name: "Legal" }).success).toBe(true);
    expect(createFolderSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("validates document tags", () => {
    expect(updateDocumentTagsSchema.safeParse({ tags: ["financial"] }).success).toBe(true);
    expect(
      updateDocumentTagsSchema.safeParse({ tags: Array.from({ length: 21 }, (_, i) => `t${i}`) })
        .success,
    ).toBe(false);
  });
});

describe("roles", () => {
  it("allows viewers to upload and admins to delete", () => {
    expect(canViewDataRoom("VIEWER")).toBe(true);
    expect(canUploadDocuments("VIEWER")).toBe(true);
    expect(canDeleteDocuments("VIEWER")).toBe(false);
    expect(canManageDeletedDocuments("VIEWER")).toBe(false);
    expect(canDeleteDocuments("ADMIN")).toBe(true);
    expect(canManageDeletedDocuments("ADMIN")).toBe(true);
    expect(canDeleteDocuments("OWNER")).toBe(true);
  });
});

describe("table utils", () => {
  const sampleDocs = [
    {
      id: "a",
      projectId: "p",
      folderId: null,
      name: "Alpha.pdf",
      originalName: "Alpha.pdf",
      mimeType: "application/pdf",
      type: "PDF" as const,
      classification: null,
      filePath: "x",
      fileSize: 100,
      status: "PENDING" as const,
      version: 1,
      tags: ["financial"],
      contentHash: "hash1",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      folder: null,
    },
    {
      id: "b",
      projectId: "p",
      folderId: null,
      name: "Beta.pdf",
      originalName: "Beta.pdf",
      mimeType: "application/pdf",
      type: "PDF" as const,
      classification: null,
      filePath: "y",
      fileSize: 200,
      status: "READY" as const,
      version: 1,
      tags: [],
      contentHash: "hash1",
      createdAt: "2026-01-02",
      updatedAt: "2026-01-02",
      folder: null,
    },
  ];

  it("filters documents by query and status", () => {
    const filtered = filterDocuments(sampleDocs, {
      query: "alpha",
      status: "PENDING",
      type: "all",
      classification: "all",
      tag: "",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("a");
  });

  it("filters by classification and tag", () => {
    const filtered = filterDocuments(sampleDocs, {
      query: "",
      status: "all",
      type: "all",
      classification: "all",
      tag: "financial",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("a");
  });

  it("filters markdown by MD type including legacy TXT rows", () => {
    const docs = [
      ...sampleDocs,
      {
        id: "md",
        projectId: "p",
        folderId: null,
        name: "README.md",
        originalName: "README.md",
        mimeType: "text/plain",
        type: "TXT" as const,
        classification: null,
        filePath: "z",
        fileSize: 50,
        status: "READY" as const,
        version: 1,
        tags: [],
        contentHash: "hash-md",
        createdAt: "2026-01-03",
        updatedAt: "2026-01-03",
        folder: null,
      },
    ];

    expect(
      filterDocuments(docs, {
        query: "",
        status: "all",
        type: "MD",
        classification: "all",
        tag: "",
      }),
    ).toHaveLength(1);

    expect(
      filterDocuments(docs, {
        query: "",
        status: "all",
        type: "TXT",
        classification: "all",
        tag: "",
      }),
    ).toHaveLength(0);
  });

  it("sorts documents by name", () => {
    const sorted = sortDocuments(sampleDocs, "name", "desc");
    expect(sorted[0]?.name).toBe("Beta.pdf");
  });

  it("detects duplicate hashes", () => {
    const map = buildDuplicateMap(sampleDocs);
    expect(map.get("b")?.name).toBe("Alpha.pdf");
  });

  it("exports CSV", () => {
    const csv = exportDocumentsCsv(sampleDocs);
    expect(csv).toContain("Alpha.pdf");
    expect(csv.split("\n").length).toBeGreaterThan(1);
  });
});

describe("preview helpers", () => {
  it("detects CSV and markdown preview modes", () => {
    expect(
      getPreviewMode({
        type: "CSV",
        mimeType: "text/csv",
        name: "data.csv",
      } as never),
    ).toBe("csv");

    expect(
      getPreviewMode({
        type: "TXT",
        mimeType: "text/plain",
        name: "README.md",
      } as never),
    ).toBe("markdown");

    expect(
      getPreviewMode({
        type: "MD",
        mimeType: "text/markdown",
        name: "README.md",
      } as never),
    ).toBe("markdown");
  });

  it("parses quoted CSV rows", () => {
    const parsed = parseCsvPreview('name,amount\n"Acme, Inc.",1000\nBeta,200');
    expect(parsed.headers).toEqual(["name", "amount"]);
    expect(parsed.rows[0]).toEqual(["Acme, Inc.", "1000"]);
    expect(parsed.rows[1]).toEqual(["Beta", "200"]);
  });

  it("detects DOCX preview mode", () => {
    expect(
      getPreviewMode({
        type: "DOCX",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        name: "report.docx",
      } as never),
    ).toBe("docx");
  });

  it("detects PPTX preview mode", () => {
    expect(
      getPreviewMode({
        type: "PPTX",
        mimeType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        name: "deck.pptx",
      } as never),
    ).toBe("pptx");
  });
});

describe("checklist", () => {
  it("computes completeness from document names and classifications", () => {
    const progress = computeChecklistProgress([
      {
        id: "1",
        name: "Board-Minutes-2023.pdf",
        classification: "LEGAL",
        type: "PDF",
        tags: [],
      } as never,
      {
        id: "2",
        name: "Financial-Statements.xlsx",
        classification: "FINANCIAL",
        type: "XLSX",
        tags: [],
      } as never,
    ]);
    expect(progress.completeCount).toBeGreaterThan(0);
    expect(progress.percent).toBeGreaterThan(0);
  });
});

describe("retention policy", () => {
  it("defaults deleted retention to 30 days", () => {
    expect(DEFAULT_DELETED_RETENTION_DAYS).toBe(30);
    expect(getDeletedRetentionDays()).toBeGreaterThanOrEqual(1);
  });
});

describe("audit export", () => {
  it("exports audit events as CSV with headers", () => {
    const csv = exportAuditEventsCsv([
      {
        id: "evt-1",
        projectId: "proj-1",
        actorId: "user-1",
        action: "SOFT_DELETED",
        resourceType: "DOCUMENT",
        resourceId: "doc-1",
        resourceName: "report.pdf",
        metadata: null,
        createdAt: new Date("2025-07-10T12:00:00.000Z"),
        actor: { id: "user-1", name: "Admin", email: "admin@example.com" },
      },
    ]);
    expect(csv).toContain("Timestamp");
    expect(csv).toContain("SOFT_DELETED");
    expect(csv).toContain("report.pdf");
    expect(csv).toContain("admin@example.com");
  });
});
