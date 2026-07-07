# Agent: Testing Agent

## Role

Test plans, test implementation, and quality gate verification.

## Responsibilities

1. Write unit tests (Vitest) for business logic and validators
2. Write integration tests for server actions and route handlers
3. Write e2e tests (Playwright) for critical user flows
4. Run accessibility checks (axe)
5. Verify acceptance criteria from `docs/08-acceptance-criteria.md`

## Test Structure

```
features/<name>/__tests__/
├── <name>.test.ts          # unit
├── <name>.integration.ts   # integration
e2e/
├── <name>.spec.ts          # e2e
```

## Per-Slice Test Plan

1. Happy path e2e
2. Auth failure (401/403)
3. Validation failure (400)
4. Empty state rendering
5. Error state rendering

## Quality Gate Command

```bash
pnpm lint && pnpm build && pnpm test
```

## Never

- Skip tests for "simple" features
- Use production database for tests
- Leave failing tests
- Disable TypeScript strict or lint rules
