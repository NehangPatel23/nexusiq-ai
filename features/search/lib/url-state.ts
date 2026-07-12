import type { ReadonlyURLSearchParams } from "next/navigation";

import type { SearchFilters, SearchMode } from "./types";

const MODES: SearchMode[] = ["hybrid", "semantic", "keyword"];

const CLASSIFICATIONS = [
  "FINANCIAL",
  "LEGAL",
  "TAX",
  "HR",
  "OPERATIONAL",
  "COMPLIANCE",
  "CONTRACT",
  "CORRESPONDENCE",
  "OTHER",
] as const;

const DOCUMENT_TYPES = [
  "PDF",
  "DOCX",
  "XLSX",
  "CSV",
  "PPTX",
  "TXT",
  "MD",
  "IMAGE",
  "OTHER",
] as const;

export type SearchUrlState = {
  query: string;
  mode: SearchMode;
  filters: SearchFilters;
};

export function parseSearchUrlState(params: ReadonlyURLSearchParams): SearchUrlState {
  const rawMode = params.get("mode");
  const mode = MODES.includes(rawMode as SearchMode) ? (rawMode as SearchMode) : "hybrid";

  const filters: SearchFilters = {};

  const type = params.get("type");
  if (type && DOCUMENT_TYPES.includes(type as (typeof DOCUMENT_TYPES)[number])) {
    filters.type = type as SearchFilters["type"];
  }

  const classification = params.get("classification");
  if (
    classification &&
    CLASSIFICATIONS.includes(classification as (typeof CLASSIFICATIONS)[number])
  ) {
    filters.classification = classification as SearchFilters["classification"];
  }

  const folderId = params.get("folderId");
  if (folderId) {
    filters.folderId = folderId;
  }

  const tag = params.get("tag");
  const tagsParam = params.get("tags");
  const parsedTags = [
    ...(tagsParam
      ? tagsParam
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : []),
    ...(tag && !tagsParam ? [tag] : []),
  ];
  if (parsedTags.length > 0) {
    filters.tags = [...new Set(parsedTags)];
  }

  const dateFrom = params.get("dateFrom");
  if (dateFrom) {
    filters.dateFrom = dateFrom;
  }

  const dateTo = params.get("dateTo");
  if (dateTo) {
    filters.dateTo = dateTo;
  }

  return {
    query: params.get("q") ?? "",
    mode,
    filters,
  };
}

export function buildSearchUrlParams(state: SearchUrlState): URLSearchParams {
  const params = new URLSearchParams();

  const trimmed = state.query.trim();
  if (trimmed) {
    params.set("q", trimmed);
  }

  if (state.mode !== "hybrid") {
    params.set("mode", state.mode);
  }

  const { filters } = state;
  if (filters.type) params.set("type", filters.type);
  if (filters.classification) params.set("classification", filters.classification);
  if (filters.folderId) params.set("folderId", filters.folderId);
  if (filters.tags?.length) params.set("tags", filters.tags.join(","));
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);

  return params;
}
