# Data and Schema Rules

## Tenancy

```
User → Organization (teams, roles) → Workspace → Project → Data Room → Intelligence
```

Roles: **Owner, Admin, Analyst, Reviewer, Viewer**

## Enterprise Entities (in addition to core)

| Entity | Purpose |
|--------|---------|
| Team, TeamMember | Org teams |
| Folder | Data room tree |
| DocumentVersion | Version history |
| AgentRun | Per-agent execution |
| ConsensusRun | Multi-agent synthesis |
| Finding | Unified agent output |
| Contradiction | Cross-doc conflicts |
| MissingItem | Missing document gaps |
| SimulationRun | Risk what-if |
| SavedSearch | Saved search queries |
| Notification | In-app notifications |

## Naming & Conventions

UUID PKs · createdAt/updatedAt · soft delete where noted · snake_case DB via `@map`

See [docs/02-data-model.md](../../docs/02-data-model.md) for full schema.

## Indexes

FK indexes · `(projectId, deletedAt)` on documents · GIN on tsvector · ivfflat on embeddings

## Never

- Neo4j or second database
- Duplicate business data across tables
- Skip tenant scoping on queries
