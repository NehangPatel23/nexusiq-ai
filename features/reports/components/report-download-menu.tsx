"use client";

import { Archive, FileDown, FileSpreadsheet, FileText, Presentation } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { FORMAT_LABELS } from "../lib/labels";

type DownloadFormat = "md" | "pdf" | "xlsx" | "pptx";

const FORMAT_ICONS = {
  md: FileText,
  pdf: FileText,
  xlsx: FileSpreadsheet,
  pptx: Presentation,
} as const;

type ReportDownloadMenuProps = {
  reportId: string;
  formats: DownloadFormat[];
  variant?: "default" | "outline" | "secondary" | "ghost";
  label?: string;
  includeZip?: boolean;
};

export function ReportDownloadMenu({
  reportId,
  formats,
  variant = "outline",
  label = "Download",
  includeZip = true,
}: ReportDownloadMenuProps) {
  async function download(format: DownloadFormat | "zip") {
    const toastId = toast.loading(
      format === "zip" ? "Building ZIP export…" : `Exporting ${FORMAT_LABELS[format] ?? format}…`,
    );
    try {
      const response = await fetch(`/api/reports/${reportId}/export?format=${format}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(payload?.error?.message || `Export failed (${response.status})`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const matched = disposition.match(/filename="([^"]+)"/);
      const fileName = matched?.[1] ?? `report.${format === "zip" ? "zip" : format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Download ready", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export report", {
        id: toastId,
      });
    }
  }

  if (formats.length === 1 && !includeZip) {
    const format = formats[0]!;
    const Icon = FORMAT_ICONS[format];
    return (
      <Button variant={variant} size="sm" onClick={() => void download(format)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {FORMAT_LABELS[format]}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" aria-label={`${label} report`}>
          <FileDown className="h-4 w-4" aria-hidden="true" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {formats.map((format) => {
          const Icon = FORMAT_ICONS[format];
          return (
            <DropdownMenuItem
              key={format}
              onSelect={() => void download(format)}
              className="gap-2"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              {FORMAT_LABELS[format]}
            </DropdownMenuItem>
          );
        })}
        {includeZip ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void download("zip")} className="gap-2">
              <Archive className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              All formats (ZIP)
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
