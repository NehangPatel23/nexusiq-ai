# Zero-Cost Solo Build Rules

## Context

This project is built by **one solo developer** with **zero budget** for APIs, SaaS, or commercial infrastructure.

## Allowed

| Category | Examples |
|----------|----------|
| Open source | Next.js, Prisma, shadcn, Ollama, Tesseract |
| Self-hosted | PostgreSQL, Ollama, LibreOffice on local machine |
| Local dev | Docker Compose for Postgres + app |
| Free tiers | Only if truly free forever with no credit card (use sparingly) |

## Forbidden in MVP

| Category | Examples |
|----------|----------|
| Paid APIs | OpenAI, Anthropic, Cohere, Pinecone |
| Commercial OCR | Google Vision, AWS Textract |
| Hosted AI | Any cloud LLM inference |
| Hosted vector DB | Pinecone, Weaviate Cloud |
| Hosted graph DB | Neo4j Aura |
| Hosted search | Algolia, Elasticsearch Cloud |
| Commercial auth | Auth0, Clerk (paid tiers) |
| Billing | Stripe, Paddle |
| Enterprise SaaS | Datadog, Sentry paid, PagerDuty |
| Cloud storage | S3, GCS, Azure Blob (required) |

## Solo Developer Assumptions

- No team roles, no code review process beyond self-review
- No CI/CD platform fees required — GitHub Actions free tier is fine
- No staging environment required — local + optional Docker Compose
- One person implements DB, API, UI, tests, and docs per slice
- Build one vertical slice completely before starting the next

## Infrastructure

```
Local machine
├── Next.js dev server
├── PostgreSQL (Docker or local install)
├── Ollama
├── Tesseract
├── LibreOffice
└── ./storage/ (document files)
```

No Kubernetes, no Terraform cloud, no managed services required.

## Escalation

If a feature **cannot** be built without a paid dependency:

1. Stop implementation
2. Document the blocker in the task file
3. Propose a free alternative or defer the feature
4. Do not silently add paid services

## Golden Rule

> If it costs money to start, it is not part of the solo MVP.
