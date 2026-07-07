# UI and UX Rules

## Design Direction

Premium enterprise SaaS — **Linear, Stripe, Notion, Arc, Vercel** quality.

- Dark mode first (light mode optional in settings)
- Glassmorphism on intelligence panels (subtle `backdrop-blur`)
- Minimal clutter, professional density
- AI thinking animations during agent runs
- Smooth Framer Motion; respect `prefers-reduced-motion`

## Every Screen Must Include

Loading skeleton · Empty state + CTA · Error + retry · Success toast · Destructive confirmation

## Global UX

- **Command palette** `Cmd+K` — navigate, upload, run scan, new chat
- **Keyboard shortcuts** — documented in settings (`?` for help)
- **Context menus** on table rows
- **Breadcrumbs** — Org → Workspace → Project → Module
- **Notifications bell** — in-app only (no paid push)

## Domain UI Patterns

| Pattern | Use |
|---------|-----|
| AgentScoreCard | Financial/Legal/etc. scores |
| ConsensusPanel | Multi-agent opinions + synthesis |
| CitationChip | Source links |
| ConfidenceBadge | HIGH/MEDIUM/LOW/INSUFFICIENT |
| RiskHeatmap | Category × severity |
| FolderTree | Data room |
| ForceGraph | Relationship visualization |
| AgentThinking | Animated indicator during AI |
| UploadDropzone | Bulk upload with progress |

## AI Output Display

Evidence panel first → citations → confidence → recommendation last.

Consensus: show agent cards before final recommendation. Never hide dissent.

## Accessibility

WCAG 2.2 AA — keyboard, ARIA, focus rings, contrast, screen readers.

See [docs/04-design-system.md](../../docs/04-design-system.md) and [docs/09-page-specifications.md](../../docs/09-page-specifications.md).
