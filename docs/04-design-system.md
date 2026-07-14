# Design System

Premium enterprise SaaS — dark default with a full light theme. Target feel: Linear, Stripe, Notion, Arc, Vercel.

---

## Design Principles

- **Trustworthy:** citations, confidence badges, evidence panels
- **Minimal:** no clutter, purposeful density
- **Futuristic:** subtle glassmorphism, AI thinking animations
- **Professional:** enterprise-grade, not hackathon
- **Readable in both themes:** status chips never use pale-on-pale text in light mode

---

## Theming

| Mode | CSS | Activation |
|------|-----|------------|
| Light | `:root` tokens | `User.theme = light` (no `.dark` on `<html>`) |
| Dark | `.dark` tokens | Default for shell / landing; `User.theme = dark` |

Appearance settings (`/dashboard/settings/appearance`) persist `User.theme` and toggle `document.documentElement.classList` + `color-scheme`.

Shadows use theme CSS variables (`--shadow-soft`, `--shadow-glow`) rather than fixed dark-only values.

---

## Color Tokens

Light (`:root`) and dark (`.dark`) both define the same semantic variables. Representative values (HSL channels without `hsl()` wrapper — Tailwind `hsl(var(--token))`):

```css
/* Light — :root */
--background: 220 24% 97%;
--foreground: 222 40% 12%;
--card: 0 0% 100%;
--primary: 213 94% 46%;
--muted-foreground: 215 14% 38%;
--accent: 252 65% 52%;
--destructive: 0 72% 48%;
--success: 152 60% 34%;
--warning: 38 92% 42%;
--border: 220 16% 86%;

/* Dark — .dark */
--background: 228 32% 4%;
--foreground: 210 28% 97%;
--card: 228 26% 7%;
--primary: 213 94% 62%;
--muted-foreground: 215 14% 58%;
--accent: 252 78% 68%;
--destructive: 0 72% 58%;
--success: 152 68% 46%;
--warning: 38 92% 55%;
--border: 228 16% 14%;
```

Source of truth: `src/app/globals.css`.

### Semantic Colors
| Token | Use |
|-------|-----|
| `risk-critical` | #ef4444 |
| `risk-high` | #f97316 |
| `risk-medium` | #eab308 |
| `risk-low` | #22c55e |
| `confidence-high` | #22c55e |
| `confidence-insufficient` | #6b7280 |

### Status tint utilities (light + dark)

Prefer these over raw `text-amber-200` / pastel-on-tint patterns so badges stay WCAG-readable in light mode:

| Utility | Purpose |
|---------|---------|
| `text-tint-amber` / `rose` / `emerald` / `sky` / `orange` | Ink text on tinted surfaces |
| `badge-tint-amber` / `rose` / `emerald` | Pill chips (border + bg + text) |
| `Badge` variants `orange` / `yellow` / `info` | Theme-aware built-ins in `src/components/ui/badge.tsx` |

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

Fonts: **Instrument Sans** (UI), **Sora** (display), **JetBrains Mono** (citations, data).

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
- Theme-aware axis/grid via CSS tokens (works in light and dark)
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

- Navigate: projects, data room, intelligence, chat, admin (owners)
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

WCAG 2.2 AA: focus rings, skip link, ARIA labels, contrast ≥ 4.5:1 (including tinted status badges in light mode), form errors linked, table headers.

---

## Responsive

| Breakpoint | Layout |
|------------|--------|
| < 768px | Drawer nav, stacked widgets |
| 768–1024px | Collapsed sidebar |
| > 1024px | Full sidebar + multi-panel |

See [09-page-specifications.md](./09-page-specifications.md) for per-page layout.
