# Feature Slices

Vertical slices — each complete (DB + API + UI + tests). **One at a time.**

Enterprise decision intelligence scope. Solo dev builds sequentially.

---

## Phase 0: Foundation
Next.js, Prisma, PostgreSQL+pgvector, shadcn dark theme, app shell, **landing page**.  
See [06-build-plan.md](./06-build-plan.md).

## Slice 1: Auth
**Task:** [tasks/01-auth.md](../tasks/01-auth.md)  
Signup, login, forgot password, profile, protected layout, dark mode default.

## Slice 2: Organizations
**Task:** [tasks/02-organizations.md](../tasks/02-organizations.md)  
Orgs, teams, roles (Owner/Admin/Analyst/Reviewer/Viewer), permissions, invites, in-app notifications.

## Slice 3: Workspaces
**Task:** [tasks/03-workspaces.md](../tasks/03-workspaces.md)  
Workspace CRUD, optional team assignment.

## Slice 4: Projects + Dashboard
**Task:** [tasks/04-projects.md](../tasks/04-projects.md)  
Project types (M&A, Vendor DD, Audit, Investment, Internal), org dashboard widgets.

## Slice 5: Data Room
**Task:** [tasks/05-uploads.md](../tasks/05-uploads.md)  
Folder tree, drag-drop, bulk upload, version history, preview, tags.

## Slice 6: Document Processing
**Task:** [tasks/06-documents.md](../tasks/06-documents.md)  
Classification, metadata, OCR, chunking, embeddings, NER, relationships, duplicates, auto-folder.

## Slice 7: Smart Search
**Task:** [tasks/07-search.md](../tasks/07-search.md)  
Hybrid NL search, filters, tags, saved searches.

## Slice 8: Interactive Chat
**Task:** [tasks/08-chat.md](../tasks/08-chat.md)  
Streaming cited Q&A, suggested questions, agent selector.

## Slice 9: Intelligence Agents
**Task:** [tasks/09-reports.md](../tasks/09-reports.md)  
Financial, Legal, Compliance, Risk, Fraud agents with scores and findings.

## Slice 10: Executive + Consensus
**Task:** [tasks/10-timeline.md](../tasks/10-timeline.md)  
Executive agent, consensus engine, explainable synthesis UI.

## Slice 11: Reports & Export
**Task:** [tasks/11-graph.md](../tasks/11-graph.md)  
Executive PDF, board report, investment memo, audit, risk register, PPTX.

## Slice 12: Timeline + Graph
**Task:** [tasks/12-risk.md](../tasks/12-risk.md)  
Executive timeline, enterprise relationship graph.

## Slice 13: Contradiction + Missing Info
**Task:** [tasks/13-tasks.md](../tasks/13-tasks.md)  
Contradiction engine, missing document detection, follow-up requests.

## Slice 14: Risk Simulator + Action Plan
**Task:** [tasks/14-history.md](../tasks/14-history.md)  
What-if scenarios, prioritized action plan kanban.

## Slice 15: History + Settings
**Task:** [tasks/15-settings.md](../tasks/15-settings.md)  
Audit log, project comparison, settings hub (profile, security, notifications, AI, appearance, shortcuts), deferred deletion + 24h account/org recovery, purge job.

## Slice 16: Admin
**Task:** [tasks/16-admin.md](../tasks/16-admin.md)  
Users, permissions, usage stats, health, reindex.

## Slice 17: Polish (parallel backlog)
**Task:** [tasks/17-polish.md](../tasks/17-polish.md)  
Cross-cutting UX and data-room polish. **Does not block core slices 6–16.** All future polish ideas go here unless explicitly requested for immediate implementation. Ship in small opportunistic batches.

---

## Slice Completion Checklist

- [ ] Prisma models + migrations
- [ ] Zod validation
- [ ] Server Actions / Route Handlers
- [ ] UI: loading, empty, error, success
- [ ] Responsive + WCAG 2.2 AA
- [ ] Unit + integration tests
- [ ] [08-acceptance-criteria.md](./08-acceptance-criteria.md) satisfied
- [ ] `pnpm build` passes

**Do not start slice N+1 until slice N is complete.**
