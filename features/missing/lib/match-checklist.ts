import type { DocumentClassification, ProjectType } from "@prisma/client";

import {
  getChecklistForProjectType,
  type ChecklistItem,
} from "@/features/missing/lib/checklists";

export type UploadedDocForMatch = {
  id: string;
  name: string;
  classification: DocumentClassification | null;
  tags: string[];
};

export type ChecklistMatchResult = {
  item: ChecklistItem;
  found: boolean;
  matchedDocumentIds: string[];
  matchedDocuments: Array<{ id: string; name: string }>;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function docMatchesHints(doc: UploadedDocForMatch, hints: string[] | undefined): boolean {
  if (!hints || hints.length === 0) return false;
  const haystack = normalize([doc.name, ...doc.tags].join(" "));
  return hints.some((hint) => haystack.includes(normalize(hint)));
}

/**
 * Match expected checklist items against READY documents using classification
 * and optional name/tag hints. An item is "found" when any document matches.
 *
 * Rules:
 * - If `nameHints` are defined, require a hint match (classification alone is
 *   too coarse — e.g. insurance ≠ SOC2 though both may be COMPLIANCE).
 * - If no hints, classification equality is sufficient.
 * - Hint-only matches are allowed when classification is null/OTHER, or when
 *   the document name itself contains a strong hint.
 */
export function matchChecklistAgainstDocuments(params: {
  projectType: ProjectType;
  documents: UploadedDocForMatch[];
}): ChecklistMatchResult[] {
  const checklist = getChecklistForProjectType(params.projectType);

  return checklist.map((item) => {
    const matched = params.documents.filter((doc) => {
      const hintMatch = docMatchesHints(doc, item.nameHints);
      const hasHints = Boolean(item.nameHints && item.nameHints.length > 0);
      const classificationMatch = doc.classification === item.expectedType;

      if (hasHints) {
        if (hintMatch) return true;
        return false;
      }

      if (classificationMatch) return true;
      return false;
    });

    return {
      item,
      found: matched.length > 0,
      matchedDocumentIds: matched.map((d) => d.id),
      matchedDocuments: matched.map((d) => ({ id: d.id, name: d.name })),
    };
  });
}

export function checklistGaps(results: ChecklistMatchResult[]): ChecklistMatchResult[] {
  return results.filter((row) => !row.found);
}
