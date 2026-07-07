# Design System

Premium enterprise SaaS — dark mode first. Target feel: Linear, Stripe, Notion, Arc, Vercel.

---

## Design Principles

- **Trustworthy:** citations, confidence badges, evidence panels
- **Minimal:** no clutter, purposeful density
- **Futuristic:** subtle glassmorphism, AI thinking animations
- **Professional:** enterprise-grade, not hackathon

---

## Color Tokens

```css
:root {
  --background: 222 47% 5%;
  --foreground: 210 40% 96%;
  --card: 222 47% 8%;
  --card-foreground: 210 40% 96%;
  --glass: 222 47% 10% / 0.7;
  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 6%;
  --secondary: 217 33% 17%;
  --muted: 217 33% 14%;
  --muted-foreground: 215 20% 55%;
  --accent: 262 83% 58%;
  --destructive: 0 63% 50%;
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --border: 217 33% 17%;
  --ring: 217 91% 60%;
  --radius: 0.625rem;
}
```

### Semantic Colors
| Token | Use |
|-------|-----|
| `risk-critical` | #ef4444 |
| `risk-high` | #f97316 |
| `risk-medium` | #eab308 |
| `risk-low` | #22c55e |
| `confidence-high` | #22c55e |
| `confidence-insufficient` | #6b7280 |

---

## Typography

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `display` | 2.5rem | 700 | Landing hero |
| `h1` | 2rem | 700 | Page titles |
| `h2` | 1.5rem | 600 | Section headers |
| `h3` | 1.25rem | 600 | Card titles |
| `body` | 0.875rem | 400 | Default text |
| `small` | 0.75rem | 400 | Meta, captions |
| `mono` | 0.8125rem | 400 | Citations, code |

Font: **Inter** (UI), **JetBrains Mono** (citations, data).

---

## Glassmorphism

```css
.glass-panel {
  background: hsl(var(--glass));
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border) / 0.5);
}
```

Use on: intelligence score cards, consensus panel, modal overlays. Sparingly.

---

## Spacing & Layout

- Base unit: 4px (Tailwind scale)
- Page padding: `px-6 py-8` desktop, `px-4 py-6` mobile
- Card padding: `p-6`
- Section gap: `space-y-8`
- App shell: sidebar 240px, topbar 56px

---

## Components (shadcn/ui + custom)

### Core
Button, Input, Textarea, Select, Checkbox, Switch, Form, Card, Table, Dialog, Sheet, Dropdown, Tabs, Badge, Avatar, Skeleton, Toast (Sonner), Command, Tooltip, Separator, ScrollArea, Popover

### Domain-Specific
| Component | Purpose |
|-----------|---------|
| `CitationChip` | Link to source chunk |
| `ConfidenceBadge` | HIGH/MEDIUM/LOW/INSUFFICIENT |
| `AgentScoreCard` | Gauge + breakdown |
| `RiskHeatmap` | Category × severity grid |
| `ConsensusPanel` | Agent opinions + synthesis |
| `DocumentStatusBadge` | pending/processing/ready/failed |
| `FolderTree` | Data room navigation |
| `TimelineView` | Executive timeline |
| `ForceGraph` | Relationship visualization |
| `AgentThinking` | Animated dots during AI run |
| `UploadDropzone` | Drag-drop with progress |
| `EmptyState` | Illustration + CTA |
| `StatCard` | Dashboard metric |

---

## Charts (Recharts)

- Risk donut, activity line, score gauges
- Dark theme axis/grid colors
- Accessible color palette (not color-only)

---

## Animations (Framer Motion)

| Animation | Duration | Use |
|-----------|----------|-----|
| Page fade | 150ms | Route transitions |
| Card stagger | 50ms delay | Lists |
| Modal slide | 200ms | Dialogs |
| Agent thinking | loop | AI processing |
| Progress bar | smooth | Upload/processing |
| Score count-up | 800ms | Agent scores |

**Reduced motion:** disable all except opacity fades.

---

## Command Palette (`Cmd+K`)

- Navigate: projects, data room, intelligence, chat
- Actions: upload, new chat, run full scan, generate report
- Search: quick document search

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd+K` | Command palette |
| `Cmd+/` | Focus chat input |
| `Cmd+U` | Upload |
| `?` | Shortcuts help |

---

## AI Output Patterns

1. **Evidence panel** — source excerpts first
2. **Citation chips** — `[Contract.pdf p.12]`
3. **Confidence badge** — always visible
4. **Agent thinking** — skeleton + animated indicator during runs
5. **Consensus view** — agent cards → agreements/conflicts → final recommendation

---

## Accessibility

WCAG 2.2 AA: focus rings, skip link, ARIA labels, contrast ≥ 4.5:1, form errors linked, table headers.

---

## Responsive

| Breakpoint | Layout |
|------------|--------|
| < 768px | Drawer nav, stacked widgets |
| 768–1024px | Collapsed sidebar |
| > 1024px | Full sidebar + multi-panel |

See [09-page-specifications.md](./09-page-specifications.md) for per-page layout.
