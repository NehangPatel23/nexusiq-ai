# Task 08: Interactive Chat

**Status:** NOT STARTED | **Slice:** 8/16 | **Depends on:** 07-search

## Goal
Project-scoped cited Q&A with streaming, suggested questions, agent selector.

## Scope
### DB: Chat, ChatMessage
### Server: SSE streaming, retrieval-first, citation parse, confidence
### UI: Session sidebar, message stream, citation chips, suggested question chips
### Example queries: "Biggest legal risk?", "Contracts expiring next year?", "Customer concentration?"

## Acceptance
docs/08-acceptance-criteria.md § 08

## Deferred — OCI / public Ollama (production)

Chat can ship on localhost with local Ollama immediately.

- [ ] **OCI worker** — [00-oci-worker-vps.md](./00-oci-worker-vps.md) § 1–5 (documents must be `READY` in prod)
- [ ] **Public Ollama HTTPS** — same file § 6 (Vercel cannot call `localhost:11434`; needs proxy + `OLLAMA_API_KEY`)
