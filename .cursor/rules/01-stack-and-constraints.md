# Stack and Constraints

## Approved Stack

**Frontend:** Next.js App Router, TypeScript, Tailwind, shadcn/ui, Framer Motion, Lucide, TanStack Query, React Hook Form, Zod, **Recharts**

**Backend:** Server Actions, Route Handlers, Prisma

**Database:** PostgreSQL + pgvector + FTS

**AI:** Ollama (chat + embeddings), Tesseract, LibreOffice, PDF.js

**Export:** @react-pdf/renderer, exceljs, pptxgenjs

**Graph viz:** react-force-graph or custom SVG (no Neo4j)

**Storage:** Local filesystem

**Auth:** Auth.js

**Testing:** Vitest, Playwright, axe

## Excluded

NestJS, Redis/BullMQ, Neo4j, OpenSearch, OpenAI/Anthropic, Pinecone, Auth0, Stripe, S3 required

## Features Folder

```
features/
  auth/ organizations/ workspaces/ projects/
  data-room/ documents/ search/ chat/
  agents/ consensus/ reports/ timeline/ graph/
  contradictions/ missing-info/ simulator/ actions/
  history/ settings/ admin/
```

## Background Jobs

In-process async. Document processing and agent runs persist status in PostgreSQL.
