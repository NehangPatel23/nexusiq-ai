import { Prisma } from "@prisma/client";

/** Prisma where fragment: documents in active projects under an organization. */
export function documentsInOrgWhere(organizationId: string): Prisma.DocumentWhereInput {
  return {
    deletedAt: null,
    project: {
      deletedAt: null,
      workspace: {
        organizationId,
        deletedAt: null,
      },
    },
  };
}

export function projectsInOrgWhere(organizationId: string): Prisma.ProjectWhereInput {
  return {
    deletedAt: null,
    workspace: {
      organizationId,
      deletedAt: null,
    },
  };
}

/**
 * Build SQL filter for document_chunks belonging to an org (optional project).
 * Returns parameterized fragments for Prisma.$executeRaw.
 */
export function buildChunkOrgFilterSql(organizationId: string, projectId?: string | null) {
  if (projectId) {
    return {
      joinAndWhere: Prisma.sql`
      FROM document_chunks dc
      INNER JOIN documents d ON d.id = dc.document_id
      INNER JOIN projects p ON p.id = d.project_id
      INNER JOIN workspaces w ON w.id = p.workspace_id
      WHERE w.organization_id = ${organizationId}
        AND w.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND d.deleted_at IS NULL
        AND p.id = ${projectId}
    `,
    };
  }

  return {
    joinAndWhere: Prisma.sql`
      FROM document_chunks dc
      INNER JOIN documents d ON d.id = dc.document_id
      INNER JOIN projects p ON p.id = d.project_id
      INNER JOIN workspaces w ON w.id = p.workspace_id
      WHERE w.organization_id = ${organizationId}
        AND w.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND d.deleted_at IS NULL
    `,
  };
}

/** Pure helper for tests — describes FTS update scope. */
export function describeFtsReindexScope(organizationId: string, projectId?: string | null) {
  return {
    organizationId,
    projectId: projectId ?? null,
    language: "english" as const,
    setExpression: "to_tsvector('english', content)",
  };
}
