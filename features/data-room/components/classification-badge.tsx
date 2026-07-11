import type { DocumentClassification } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { getClassificationLabel } from "../lib/classifications";

export function ClassificationBadge({
  classification,
}: {
  classification: DocumentClassification | string | null;
}) {
  if (!classification) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <Badge variant="secondary" className="normal-case tracking-normal">
      {getClassificationLabel(classification)}
    </Badge>
  );
}
