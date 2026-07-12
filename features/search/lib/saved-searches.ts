import type { SearchMode as PrismaSearchMode } from "@prisma/client";

import { prisma } from "@/lib/db";

import type { SavedSearchItem, SearchFilters, SearchMode } from "./types";

function toClientMode(mode: PrismaSearchMode): SearchMode {
  return mode.toLowerCase() as SearchMode;
}

function toPrismaMode(mode: SearchMode): PrismaSearchMode {
  return mode.toUpperCase() as PrismaSearchMode;
}

function mapSavedSearch(row: {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  query: string;
  filters: unknown;
  mode: PrismaSearchMode;
  createdAt: Date;
}): SavedSearchItem {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    name: row.name,
    query: row.query,
    filters: (row.filters ?? {}) as SearchFilters,
    mode: toClientMode(row.mode),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listSavedSearches(projectId: string, userId: string) {
  const rows = await prisma.savedSearch.findMany({
    where: { projectId, userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapSavedSearch);
}

export async function createSavedSearch(
  projectId: string,
  userId: string,
  input: {
    name: string;
    query: string;
    filters: SearchFilters;
    mode: SearchMode;
  },
) {
  const row = await prisma.savedSearch.create({
    data: {
      projectId,
      userId,
      name: input.name,
      query: input.query,
      filters: input.filters,
      mode: toPrismaMode(input.mode),
    },
  });
  return mapSavedSearch(row);
}

export async function getSavedSearchById(id: string) {
  const row = await prisma.savedSearch.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          workspace: { select: { organizationId: true } },
        },
      },
    },
  });
  if (!row) return null;
  return {
    ...mapSavedSearch(row),
    organizationId: row.project.workspace.organizationId,
  };
}

export async function deleteSavedSearch(id: string) {
  await prisma.savedSearch.delete({ where: { id } });
}
