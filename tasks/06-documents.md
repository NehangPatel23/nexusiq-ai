# Task 06: Document Processing

**Status:** DONE | **Slice:** 6/16 | **Depends on:** 05-data-room

## Goal
Full AI document pipeline: classify, extract, chunk, embed, NER, graph, duplicates.

## Scope
### DB: DocumentChunk, Entity, EntityRelation; classification on Document
### Pipeline (`lib/ai/processing/`):
1. Classify (financial/legal/tax/hr/compliance/contract/other)
2. Extract text (PDF.js, LibreOffice, Tesseract)
3. Metadata extraction, NER, relationship extraction
4. Semantic chunking + Ollama embeddings + FTS index
5. Duplicate detection (contentHash), auto-folder suggestion
6. Cross-document entity linking
### UI: Document list with status badges, processing progress, reprocess action

## Acceptance
docs/08-acceptance-criteria.md § 06

## Deferred — OCI worker (production)

Local pipeline and UX are **DONE**. Cloud processing on Vercel is blocked until an OCI VPS runs the worker.

- [ ] Complete [00-oci-worker-vps.md](./00-oci-worker-vps.md) when Oracle instance is available
- Until then: localhost with `ENABLE_INLINE_PROCESSING=true` or `pnpm worker:process`
