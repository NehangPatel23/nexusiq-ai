# Task 16: Admin

**Status:** DONE | **Slice:** 16/16 | **Depends on:** 06-documents, 15-settings

## Goal
System admin: health, usage, users, reindex.

## Scope
### Health: PostgreSQL, Ollama, disk space
### Usage: documents processed, agent runs, storage used (PostgreSQL aggregates)
### User management (owner only)
### Maintenance: reindex FTS, re-embed all (with confirmation)
### UI: `/dashboard/admin` — health cards, queue status, action buttons

## Acceptance
docs/08-acceptance-criteria.md § 16 — passed

## Deferred — OCI worker (production)

Admin processing queue / worker health should reflect the live OCI worker when provisioned.

- [ ] Surface OCI worker status (last poll, queue depth, failed count) — depends on [00-oci-worker-vps.md](./00-oci-worker-vps.md)
- [ ] Optional: SSH or OCI metrics link in admin docs only (no secrets in UI)
