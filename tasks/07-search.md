# Task 07: Smart Search

**Status:** DONE | **Slice:** 7/16 | **Depends on:** 06-documents

## Goal
Google-quality enterprise search: NL, semantic, hybrid, filters, saved searches.

## Scope
### DB: SavedSearch
### Server: `lib/ai/retrieval.ts` — hybrid RRF, filters (type, date, folder, tag)
### UI: Search page, command palette integration, highlighted snippets, save search

## Acceptance
docs/08-acceptance-criteria.md § 07

## Deferred — OCI worker (production)

Build and test search on **localhost** (processed chunks in local or Supabase DB).

- [ ] After [00-oci-worker-vps.md](./00-oci-worker-vps.md): verify hybrid search against **Vercel-uploaded** docs once OCI worker fills chunks in prod Supabase
