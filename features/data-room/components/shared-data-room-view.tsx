"use client";

import { Download, FileText, FolderOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { DocumentPreviewContent } from "./document-preview-content";
import { DocumentStatusBadge } from "./document-status-badge";
import { formatFileSize, getDocumentTypeLabel } from "../lib/mime";
import type { DataRoomDocument, DataRoomFolderNode } from "../lib/types";

function flattenFolders(tree: DataRoomFolderNode[]): DataRoomFolderNode[] {
  const out: DataRoomFolderNode[] = [];
  for (const node of tree) {
    out.push(node);
    out.push(...flattenFolders(node.children));
  }
  return out;
}

interface SharedDataRoomViewProps {
  token: string;
  projectName: string;
  workspaceName: string;
  shareLabel: string | null;
  initialFolders: DataRoomFolderNode[];
  initialDocuments: DataRoomDocument[];
}

export function SharedDataRoomView({
  token,
  projectName,
  workspaceName,
  shareLabel,
  initialFolders,
  initialDocuments,
}: SharedDataRoomViewProps) {
  const [folders] = useState(initialFolders);
  const [documents] = useState(initialDocuments);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DataRoomDocument | null>(null);
  const [query, setQuery] = useState("");

  const flatFolders = useMemo(() => flattenFolders(folders), [folders]);

  const visibleDocuments = useMemo(() => {
    let list =
      selectedFolderId === null
        ? documents
        : documents.filter((d) => d.folderId === selectedFolderId);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [documents, selectedFolderId, query]);

  const handleDownload = useCallback(
    (doc: DataRoomDocument) => {
      window.open(
        `/api/share/data-room/${token}/documents/${doc.id}?download=1`,
        "_blank",
        "noopener,noreferrer",
      );
    },
    [token],
  );

  useEffect(() => {
    if (selectedDoc && !visibleDocuments.some((d) => d.id === selectedDoc.id)) {
      setSelectedDoc(null);
    }
  }, [selectedDoc, visibleDocuments]);

  const previewUrl = selectedDoc
    ? `/api/share/data-room/${token}/documents/${selectedDoc.id}?preview=1`
    : "";

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-8">
      <header className="space-y-1 border-b border-border/60 pb-4">
        <p className="text-sm text-muted-foreground">{workspaceName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{projectName}</h1>
        <p className="text-sm text-muted-foreground">
          {shareLabel ? `${shareLabel} · ` : ""}Read-only shared data room
        </p>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)_minmax(280px,340px)]">
        <aside className="rounded-xl border border-border/60 bg-card/30 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Folders
          </p>
          <button
            type="button"
            className={cn(
              "mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
              selectedFolderId === null && "bg-primary/15 font-medium",
            )}
            onClick={() => setSelectedFolderId(null)}
          >
            <FolderOpen className="size-4 shrink-0" aria-hidden />
            All files
          </button>
          {flatFolders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                selectedFolderId === folder.id && "bg-primary/15 font-medium",
              )}
              onClick={() => setSelectedFolderId(folder.id)}
            >
              <FolderOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{folder.name}</span>
            </button>
          ))}
        </aside>

        <main className="min-w-0 rounded-xl border border-border/60 bg-card/20 p-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="mb-3 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Search documents"
          />

          {visibleDocuments.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <FileText className="size-10 opacity-40" aria-hidden />
              <p>No documents in this folder</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-border/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium">Size</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className={cn(
                        "cursor-pointer border-b border-border/40 last:border-0 hover:bg-muted/30",
                        selectedDoc?.id === doc.id && "bg-primary/10",
                      )}
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <td className="max-w-[240px] truncate px-2 py-2 font-medium">{doc.name}</td>
                      <td className="px-2 py-2 text-muted-foreground">{getDocumentTypeLabel(doc)}</td>
                      <td className="px-2 py-2 tabular-nums text-muted-foreground">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="px-2 py-2">
                        <DocumentStatusBadge status={doc.status} />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(doc);
                          }}
                          aria-label={`Download ${doc.name}`}
                        >
                          <Download className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        <aside className="min-h-[320px] rounded-xl border border-border/60 bg-card/30 p-3">
          {selectedDoc ? (
            <div className="flex h-full flex-col gap-3">
              <div>
                <h2 className="truncate font-medium">{selectedDoc.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedDoc.fileSize)} · {selectedDoc.type}
                </p>
              </div>
              <DocumentPreviewContent
                document={selectedDoc}
                previewUrl={previewUrl}
                onDownload={() => handleDownload(selectedDoc)}
                className="min-h-[200px] flex-1"
              />
              <Button type="button" variant="outline" onClick={() => handleDownload(selectedDoc)}>
                <Download className="size-4" />
                Download
              </Button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a document to preview
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
