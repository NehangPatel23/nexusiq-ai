# API Contracts

Enterprise API contracts. Route Handlers in `app/api/`, Server Actions in `features/*/actions/`.

---

## Response Envelope

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };
```

## Auth & Pagination

- All protected routes: session required (`401` / `403`)
- Pagination: `?page=1&pageSize=20` → `{ items, total, page, pageSize, hasMore }`

---

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/forgot-password` | Request reset |
| POST | `/api/auth/reset-password` | Reset with token |
| POST | `/api/auth/[...nextauth]` | Auth.js |

Actions: `signIn`, `signOut`, `register`, `updateProfile`, `changePassword`

---

## Organizations & Teams

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/organizations` | List/create |
| GET/PATCH/DELETE | `/api/organizations/[orgId]` | CRUD |
| GET/POST | `/api/organizations/[orgId]/teams` | Teams |
| GET/POST | `/api/organizations/[orgId]/members` | Members |
| PATCH/DELETE | `/api/organizations/[orgId]/members/[id]` | Update role/remove |
| POST | `/api/organizations/[orgId]/invites` | Invite |

---

## Workspaces & Projects

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/organizations/[orgId]/workspaces` | Workspaces (`?status=deleted` admin-only) |
| GET/PATCH/DELETE | `/api/workspaces/[id]` | Workspace CRUD (DELETE = soft delete) |
| POST | `/api/workspaces/[id]/restore` | Restore soft-deleted workspace (admin+) |
| DELETE | `/api/workspaces/[id]/permanent` | Permanently delete workspace (admin+) |
| GET/POST | `/api/workspaces/[id]/projects` | Projects |
| GET/PATCH/DELETE | `/api/projects/[id]` | Project CRUD |
| GET | `/api/dashboard` | Dashboard widgets data |

---

## Data Room

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[id]/folders` | Folder tree |
| PATCH/DELETE | `/api/folders/[id]` | Folder CRUD |
| POST | `/api/projects/[id]/upload` | Multipart upload |
| GET | `/api/projects/[id]/documents` | List documents |
| GET/DELETE | `/api/documents/[id]` | Get/delete |
| GET | `/api/documents/[id]/versions` | Version history |
| POST | `/api/documents/[id]/reprocess` | Reprocess |

---

## Search

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/projects/[id]/search` | Hybrid search |
| GET/POST | `/api/projects/[id]/saved-searches` | Saved searches |
| DELETE | `/api/saved-searches/[id]` | Delete saved |

---

## Chat

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[id]/chats` | Chat sessions |
| PATCH/DELETE | `/api/chats/[id]` | Rename, pin, change agent, or delete owner session |
| GET | `/api/chats/[id]/messages` | Paginated messages (oldest first) |
| POST | `/api/chats/[id]/messages` | Send (SSE stream) |
| GET | `/api/projects/[id]/chat/suggested-questions` | Suggested prompts, optionally by `agentType` |

SSE events:
```text
event: token
data: {"delta":"..."}

event: done
data: {"messageId","citations","confidence","content","retrievedChunks"}

event: error
data: {"code","message"}
```

Chat sessions are user-owned and require data-room view access to the project organization.
An unavailable generation endpoint returns `503 OLLAMA_UNAVAILABLE` before streaming starts.

---

## Intelligence Agents

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/projects/[id]/agents/financial/run` | Run financial agent |
| POST | `/api/projects/[id]/agents/legal/run` | Run legal agent |
| POST | `/api/projects/[id]/agents/compliance/run` | Run compliance agent |
| POST | `/api/projects/[id]/agents/risk/run` | Run risk agent |
| POST | `/api/projects/[id]/agents/fraud/run` | Run fraud agent |
| POST | `/api/projects/[id]/agents/executive/run` | Run executive agent |
| POST | `/api/projects/[id]/agents/consensus/run` | Run consensus engine |
| GET | `/api/projects/[id]/agents/runs` | List agent runs |
| GET | `/api/agent-runs/[id]` | Get run detail + findings |

Agent run response:
```typescript
{
  runId: string;
  agentType: string;
  score?: number;
  confidence: ConfidenceLevel;
  findings: Finding[];
  citations: Citation[];
  status: "running" | "completed" | "failed";
}
```

Consensus response adds: `agentOpinions[]`, `agreements[]`, `conflicts[]`, `resolutionRationale`, `finalRecommendation`

---

## Contradictions & Missing Info

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/projects/[id]/contradictions/scan` | Run contradiction scan |
| GET | `/api/projects/[id]/contradictions` | List contradictions |
| PATCH | `/api/contradictions/[id]` | Update status |
| POST | `/api/projects/[id]/missing/scan` | Run missing info scan |
| GET | `/api/projects/[id]/missing` | List missing items |
| POST | `/api/projects/[id]/missing/export-requests` | Export follow-up list |

---

## Risk Simulator

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/projects/[id]/simulations` | Run scenario |
| GET | `/api/projects/[id]/simulations` | List runs |
| GET | `/api/simulations/[id]` | Get delta vs baseline |

Request: `{ scenarioName, parameters: { revenueChange?: number, customerLoss?: string, ... } }`

---

## Reports & Export

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[id]/reports` | List/generate |
| GET | `/api/reports/[id]` | Get report |
| GET | `/api/reports/[id]/export` | Download PDF/MD/XLSX/PPTX |

---

## Timeline & Graph

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[id]/timeline` | Events |
| POST | `/api/projects/[id]/timeline/extract` | AI extract |
| GET | `/api/projects/[id]/graph` | Nodes + edges |
| POST | `/api/projects/[id]/graph/extract` | AI extract |

---

## Action Plan (Tasks)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[id]/tasks` | Action items |
| PATCH/DELETE | `/api/tasks/[id]` | Update/delete |

---

## Notifications & History

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | User notifications (`?archived=true` for archived inbox) |
| PATCH | `/api/notifications/read-all` | Mark all inbox notifications read |
| PATCH | `/api/notifications/[id]/read` | Mark read |
| PATCH | `/api/notifications/[id]/archive` | Archive notification |
| POST | `/api/notifications/[id]/unarchive` | Restore archived notification to inbox |
| DELETE | `/api/notifications/[id]` | Permanently delete notification |
| POST | `/api/notifications/bulk` | Bulk read / archive / unarchive / delete (`{ action, ids }`) |
| GET | `/api/organizations/[orgId]/audit` | Audit log |
| GET | `/api/organizations/[orgId]/compare` | Compare projects |

---

## Settings & Admin

| Method | Path | Description |
|--------|------|-------------|
| GET/PATCH | `/api/settings/profile` | User profile |
| GET/PATCH | `/api/settings/ai` | Ollama config |
| GET | `/api/admin/health` | System health |
| GET | `/api/admin/usage` | Usage stats |
| POST | `/api/admin/reindex` | Reindex search |

---

## Error Codes

`UNAUTHORIZED` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `VALIDATION_ERROR` (400) · `CONFLICT` (409) · `PROCESSING_ERROR` (500) · `OLLAMA_UNAVAILABLE` (503)
