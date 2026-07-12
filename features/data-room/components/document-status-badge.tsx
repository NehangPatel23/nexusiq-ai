"use client";

import type { DocumentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { formatProcessingError } from "../lib/processing-errors";

const STATUS_VARIANT: Record<
  DocumentStatus,
  "default" | "secondary" | "warning" | "success" | "destructive"
> = {
  PENDING: "warning",
  PROCESSING: "default",
  READY: "success",
  FAILED: "destructive",
};

export function DocumentStatusBadge({
  status,
  errorMessage,
}: {
  status: DocumentStatus;
  errorMessage?: string | null;
}) {
  const badge = <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;

  if (status === "FAILED" && errorMessage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help">{badge}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p className="text-sm">{formatProcessingError(errorMessage)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
