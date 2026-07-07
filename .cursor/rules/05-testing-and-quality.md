# Testing and Quality Rules

## Test Layers

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Pure functions, validators, utilities |
| Integration | Vitest + Prisma test DB | Server actions, route handlers, DB queries |
| E2E | Playwright | Critical user flows per feature slice |
| Accessibility | axe-core / @axe-core/playwright | WCAG checks on key pages |

## Definition of Done

A feature is complete only when:

- [ ] Compiles (`pnpm build` passes)
- [ ] Lints (`pnpm lint` passes)
- [ ] Unit tests pass
- [ ] Integration tests pass for new server logic
- [ ] E2E test for happy path (where applicable)
- [ ] Accessibility check passes
- [ ] Loading, empty, error states implemented
- [ ] Responsive on mobile and desktop
- [ ] No TODOs or placeholder logic
- [ ] Task file and docs updated if contracts changed

## Test Conventions

- Co-locate tests: `*.test.ts` next to source or in `__tests__/`
- Use test database (separate `DATABASE_URL` for tests)
- Seed minimal fixtures per test — no shared mutable state
- Mock Ollama in unit/integration tests; optional real Ollama in manual QA

## Keep App Runnable

- Every commit should leave the app buildable
- Migrations must be reversible or documented
- Feature flags not required for MVP — incomplete slices stay on branches

## Code Quality

- Strict TypeScript — no undocumented `any`
- Small functions, single responsibility
- Meaningful names — no `helper.ts`, `utils2.ts`
- Reuse shared validation (Zod schemas) and types

## Security Checks

- Auth on every protected route/action
- Authorization scoped to organization membership
- Input validation at API boundary
- No secrets in code or commits
- Sanitize user-facing AI output (XSS prevention)

## Performance (Measure Before Optimizing)

- Server Components by default
- Lazy load heavy client components
- Virtualize long document/chunk lists
- Avoid N+1 queries — use Prisma `include` thoughtfully
