import type { DocumentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<
  DocumentStatus,
  "default" | "secondary" | "warning" | "success" | "destructive"
> = {
  PENDING: "warning",
  PROCESSING: "default",
  READY: "success",
  FAILED: "destructive",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}
