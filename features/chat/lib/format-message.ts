import { stripCitationMarkers } from "@/lib/ai/citations";
import { stripConfidenceMarker } from "@/lib/ai/confidence";

import { normalizeAssistantMarkdown } from "./normalize-markdown";

export function formatAssistantContent(content: string): string {
  return normalizeAssistantMarkdown(stripCitationMarkers(stripConfidenceMarker(content)));
}
