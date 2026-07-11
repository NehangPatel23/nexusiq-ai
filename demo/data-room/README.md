# Helix Analytics — Demo Data Room

Fictional M&A diligence files for **Helix Analytics, Inc.** (B2B analytics SaaS, ~$38.3M ARR).

Use these to demo bulk upload, folder structure preservation, and future AI agent analysis.
Several files contain intentional inconsistencies for contradiction detection (e.g. investor deck
vs. audited financials, AR aging vs. management narrative).

## Upload walkthrough

1. Create an **M&A** project in NexusIQ.
2. Open **Data Room** → **Upload**.
3. Drag the entire `demo/data-room` folder (or select all files).
4. Folder paths (`01-Financials`, `02-Legal`, etc.) are preserved on bulk upload.

## Regenerate files

```bash
pnpm exec tsx scripts/generate-demo-data-room.ts
```

## File inventory

| Folder | Files | Formats |
|--------|-------|---------|
| 01-Financials | Revenue CSV, AR aging, CapEx, MD&A, audited summary | CSV, TXT, PDF |
| 02-Legal | Contracts summary, AWS MSA excerpt, CEO employment | TXT, PDF |
| 03-Compliance | GDPR ROPA, SOC2 summary, PCI notes | CSV, TXT, PDF |
| 04-HR | Headcount, executive bios | CSV, TXT |
| 05-Commercial | Top customers, churn analysis | CSV, TXT |
| 06-Corporate-Governance | Board minutes (related party) | TXT |
| 07-Investor-Materials | Nov 2023 investor update | PDF |

All content is synthetic — no real companies or persons.
