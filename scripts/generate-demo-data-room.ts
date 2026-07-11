/**
 * Generates realistic demo files for the Data Room bulk-upload walkthrough.
 * Run: pnpm exec tsx scripts/generate-demo-data-room.ts
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "demo", "data-room");

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text: string, maxLen = 92): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLen && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function createPdf(pages: string[][]): Buffer {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  let nextId = 1;

  const catalogId = nextId++;
  const pagesId = nextId++;
  const fontId = nextId++;

  objects[fontId] = `${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  for (const pageLines of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageObjectIds.push(pageId);

    const wrapped = pageLines.flatMap((line) => (line === "" ? [""] : wrapLine(line)));
    let stream = "BT\n/F1 10 Tf\n";
    let y = 740;
    for (const line of wrapped) {
      if (y < 60) break;
      if (line === "") {
        y -= 8;
        continue;
      }
      stream += `1 0 0 1 54 ${y} Tm\n(${escapePdfText(line)}) Tj\n`;
      y -= 13;
    }
    stream += "ET";

    objects[contentId] =
      `${contentId} 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj\n`;

    objects[pageId] =
      `${pageId} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\nendobj\n`;
  }

  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects[pagesId] =
    `${pagesId} 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageObjectIds.length} >>\nendobj\n`;
  objects[catalogId] =
    `${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`;

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i < objects.length; i++) {
    if (!objects[i]) continue;
    offsets[i] = Buffer.byteLength(body, "utf8");
    body += objects[i];
  }

  const xrefOffset = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i < objects.length; i++) {
    const off = offsets[i] ?? 0;
    body += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body, "utf8");
}

async function writePdf(relativePath: string, pages: string[][]) {
  const fullPath = path.join(OUT_DIR, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, createPdf(pages));
}

async function writeText(relativePath: string, content: string) {
  const fullPath = path.join(OUT_DIR, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf8");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  await writeText(
    "01-Financials/Revenue-by-Segment-FY2021-2023.csv",
    `Fiscal Year,Segment,ARR (USD),YoY Growth %,Gross Margin %
2021,Enterprise Platform,18400000,,
2021,Professional Services,3200000,,
2021,Embedded Analytics API,2100000,,
2022,Enterprise Platform,24100000,31.0,78.2
2022,Professional Services,4100000,28.1,42.5
2022,Embedded Analytics API,2900000,38.1,81.0
2023,Enterprise Platform,29800000,23.7,77.4
2023,Professional Services,4800000,17.1,39.8
2023,Embedded Analytics API,3700000,27.6,79.6
2023,Total ARR,38300000,18.4,72.1
`,
  );

  await writeText(
    "01-Financials/AR-Aging-Report-Dec-2023.csv",
    `Customer,Invoice Bucket,Amount USD,Days Outstanding,Notes
Meridian Financial Group,Current,142000,18,Annual prepay — renews Apr 2024
Meridian Financial Group,31-60,0,0,
Northwind Logistics,Current,89000,12,
Northwind Logistics,61-90,45000,74,Disputed SOW change order
Cascade Health Systems,Current,76000,9,
Cascade Health Systems,91-120,76000,103,Past due — CFO aware per Jan email
Brightline Retail Co,Current,54000,22,
Brightline Retail Co,31-60,54000,47,
Summit Manufacturing,Current,48000,15,
Summit Manufacturing,121+,96000,138,Collections engaged — no written-off policy
Helix Internal (Pilot),Current,12000,5,Related party — see board minutes
Total,,632000,,
`,
  );

  await writeText(
    "01-Financials/CapEx-and-Depreciation-Schedule.csv",
    `Asset Class,FY2021,FY2022,FY2023,Useful Life (yrs),Notes
Server hardware & racks,420000,310000,180000,5,Colo migration to AWS completed Q2 2023
Capitalized software dev,890000,1120000,1340000,3,R&D capitalization policy — see audit memo
Office leasehold improvements,210000,45000,12000,7,Austin HQ downsized Oct 2023
Furniture & equipment,85000,22000,8000,7,
Total CapEx,1605000,1497000,1540000,,
`,
  );

  await writeText(
    "01-Financials/FY2023-Management-Discussion.txt",
    `HELIX ANALYTICS, INC.
Management Discussion & Analysis — Fiscal Year Ended December 31, 2023
CONFIDENTIAL — DATA ROOM COPY

Executive Summary
Helix Analytics delivered another year of strong growth in FY2023, ending the period with
$38.3M in annual recurring revenue (ARR), representing 18.4% year-over-year growth. Gross
margin remained healthy at 72.1% consolidated, with platform subscription margins above 77%.

The company added 47 net-new enterprise logos and expanded net revenue retention (NRR) to
112%, driven primarily by seat expansion within financial services and healthcare verticals.
Management believes the business is well-positioned for a strategic transaction or Series C
raise in H1 2024.

Revenue Quality
Approximately 94% of revenue is subscription-based. Professional services revenue is
non-strategic and management intends to wind down fixed-bid implementations by Q3 2024 in
favor of partner-led delivery.

Cash & Liquidity
Cash and equivalents at year-end: $14.2M. Monthly net burn averaged $420K in H2 2023 after
headcount reductions. Runway exceeds 24 months at current burn without additional financing.

Key Risks (management view)
- Customer concentration: top 10 customers represent 41% of ARR (improved from 48% in 2022)
- AWS infrastructure costs rose 22% YoY; renegotiation underway
- Deferred revenue recognition policy under review with external auditors

Prepared by: Elena Vasquez, CFO
Date: February 14, 2024
`,
  );

  await writePdf("01-Financials/FY2023-Audited-Financial-Statements-Summary.pdf", [
    [
      "HELIX ANALYTICS, INC.",
      "Summary Financial Statements — Audited",
      "Fiscal Year Ended December 31, 2023",
      "Deloitte & Touche LLP — Independent Auditor",
      "",
      "CONSOLIDATED STATEMENT OF OPERATIONS (USD thousands)",
      "Revenue                           38,300",
      "Cost of revenue                   10,680",
      "Gross profit                      27,620",
      "Operating expenses:",
      "  Research & development          11,240",
      "  Sales & marketing                9,870",
      "  General & administrative         4,120",
      "Operating loss                    (2,610)",
      "Net loss                          (3,140)",
      "",
      "CONSOLIDATED BALANCE SHEET HIGHLIGHTS",
      "Cash & equivalents                14,200",
      "Accounts receivable, net           6,320",
      "Deferred revenue                  18,900",
      "Total assets                      52,400",
      "Total liabilities                 21,800",
      "",
      "AUDITOR EMPHASIS OF MATTER",
      "The Company capitalized $1.34M of internal software development costs in FY2023.",
      "Management's policy is under review; a restatement is possible but not probable.",
      "",
      "Opinion: Unqualified — February 28, 2024",
    ],
  ]);

  await writeText(
    "02-Legal/Material-Contracts-Summary.txt",
    `HELIX ANALYTICS, INC. — MATERIAL CONTRACTS SUMMARY
As of January 15, 2024 | Prepared by: Morrison & Callahan LLP

1. Amazon Web Services Enterprise Discount Program (EDP)
   Counterparty: Amazon Web Services, Inc.
   Effective: March 1, 2022 | Expires: February 28, 2025
   Commit: $2.4M annual spend | Early termination fee: 35% of remaining commit
   Notes: Section 8.3 allows AWS to increase unit pricing up to 40% upon renewal.
   Status: ACTIVE — renewal negotiations not started

2. Meridian Financial Group — Master Subscription Agreement
   ARR: ~$4.6M (12.0% of total ARR)
   Term: 36 months from April 1, 2022
   Auto-renews for successive 12-month periods unless terminated with 90 days notice
   Most-favored-nation clause on pricing for comparable enterprise tier

3. CEO Employment Agreement — David Chen
   Base salary: $385,000 | Target bonus: 60%
   Change-of-control severance: 2x base + bonus + 18 months benefits
   Non-compete: 12 months (California enforceability uncertain)

4. Office Lease — 2200 Westlake Drive, Austin TX
   Landlord: Westlake Office Partners LP
   Expires: September 30, 2027 | Remaining obligation: ~$3.1M
   No early termination without landlord consent

5. Reseller Agreement — DataBridge Partners (EMEA)
   Exclusive in UK/DE for embedded analytics SKU
   Minimum quarterly commit: EUR 180,000
   Related party: DataBridge CEO is brother-in-law of Helix VP Sales (disclosed)
`,
  );

  await writePdf("02-Legal/Vendor-MSA-CloudHost-Excerpt.pdf", [
    [
      "MASTER SERVICES AGREEMENT — EXCERPT",
      "Helix Analytics, Inc. and Amazon Web Services, Inc.",
      "Executed: February 28, 2022",
      "",
      "Section 4.2 — Pricing and Volume Discounts",
      "Customer commits to minimum annual spend of USD 2,400,000 across eligible services.",
      "Failure to meet commit triggers true-up invoice within 30 days of contract year end.",
      "",
      "Section 8.3 — Renewal Pricing",
      "Upon renewal, Provider may adjust list pricing by up to forty percent (40%) without",
      "Customer consent, provided thirty (30) days written notice is given.",
      "",
      "Section 11.1 — Termination for Convenience",
      "Either party may terminate with one hundred eighty (180) days notice after year two.",
      "Customer remains liable for early termination fees per Exhibit B.",
      "",
      "Section 14.7 — Data Processing",
      "Provider processes Customer Data in US-East-1 and EU-West-1 regions only.",
      "Sub-processors listed in Exhibit D; Customer notified of changes via email.",
      "",
      "CONFIDENTIAL — ATTORNEY-CLIENT PRIVILEGE MAY APPLY TO INTERNAL MARKUPS",
    ],
  ]);

  await writeText(
    "02-Legal/Employment-Agreement-CEO-Excerpt.txt",
    `EMPLOYMENT AGREEMENT EXCERPT
David Chen, Chief Executive Officer
Helix Analytics, Inc.

Section 5 — Compensation
Base Salary: $385,000 per annum, reviewed annually by the Board.
Target Annual Bonus: 60% of base salary based on company performance metrics.

Section 9 — Change in Control
Upon a Change in Control (as defined), if Executive's employment is terminated without
Cause or Executive resigns for Good Reason within 12 months:
  (a) Cash severance equal to 2.0x (Base Salary + Target Bonus)
  (b) COBRA premiums for 18 months
  (c) Full acceleration of 75% of unvested equity awards

Section 12 — Restrictive Covenants
Non-solicitation of employees: 18 months post-termination
Non-compete: 12 months within North American enterprise analytics market
  * California counsel opinion (Dec 2023): non-compete likely unenforceable

Signed: March 15, 2021
`,
  );

  await writeText(
    "03-Compliance/GDPR-ROPA-Extract.csv",
    `Processing Activity,Legal Basis,Data Categories,Retention,Cross-Border Transfer,Status
Customer analytics ingestion,Contract Art. 6(1)(b),Usage logs pseudonymized,24 months,US-East-1 via SCCs,Compliant
Employee HR records,Legal obligation Art. 6(1)(c),PII payroll tax,7 years,None,Compliant
Marketing email campaigns,Consent Art. 6(1)(a),Email name company,Until opt-out,US via SCCs,Compliant
Support ticket attachments,Legitimate interest Art. 6(1)(f),Free-text may contain PII,36 months,US-East-1,Review needed
Legacy backup tapes (2019-2021),Unknown,Full DB snapshots,Indefinite — not purged,US colo decommissioned,NON-COMPLIANT
Beta feature telemetry,Consent Art. 6(1)(a),Device IDs IP addresses,12 months,US-East-1,Compliant
`,
  );

  await writeText(
    "03-Compliance/SOC2-Type-II-Executive-Summary.txt",
    `HELIX ANALYTICS, INC.
SOC 2 Type II Report — Executive Summary
Examination Period: January 1 – December 31, 2023
Service Auditor: Schellman & Company, LLC

Scope: Helix Cloud Platform (production environment only)
Trust Services Criteria: Security, Availability, Confidentiality

Overall Opinion: UNQUALIFIED with management letter items

Key Test Results
- Logical access controls: Effective
- Change management: Effective with 2 exceptions (emergency changes without retro review)
- Vulnerability management: Effective
- Encryption in transit: Effective (TLS 1.2+ enforced)

Exceptions Noted
1. EX-2023-04: Legacy "Insights Batch" subsystem stores intermediate CSV exports on local
   disk without AES-256 encryption at rest. Remediation planned Q1 2024.
2. EX-2023-09: 3 terminated contractor accounts active for 11 days post-offboarding.

Management Response: Both items acknowledged. EX-2023-04 fix ETA March 31, 2024.

Subservice Organizations: AWS (carve-out), SendGrid (inclusive method)

Distribution: Restricted — NDA required
`,
  );

  await writePdf("03-Compliance/PCI-DSS-Self-Assessment-Notes.pdf", [
    [
      "HELIX ANALYTICS, INC.",
      "PCI DSS SAQ-A EP — Internal Assessment Notes",
      "Assessment Date: November 2023",
      "",
      "Scope: Helix billing portal (payments handled by Stripe — SAQ A eligible)",
      "",
      "Requirement 2 — Do not use vendor defaults",
      "Status: PASS — hardened AMIs, SSH key-only access",
      "",
      "Requirement 6 — Develop secure systems",
      "Status: PASS with observation — dependency scanning not enforced in CI for",
      "legacy monolith repo (scheduled for Q1 2024 migration)",
      "",
      "Requirement 10 — Track and monitor access",
      "Status: PARTIAL — CloudTrail enabled; log retention 90 days only (PCI recommends 1 yr)",
      "",
      "Requirement 12 — Information security policy",
      "Status: PASS — policy last updated September 2023",
      "",
      "Overall: Merchant attestation pending QSA review. No card data stored on Helix systems.",
    ],
  ]);

  await writeText(
    "04-HR/Headcount-by-Department-2023.csv",
    `Department,Jan 2023,Jun 2023,Dec 2023,Open Reqs (Dec),Fully Loaded Cost (Dec USD)
Engineering,98,104,96,8,14200000
Product & Design,22,24,23,2,3100000
Sales,48,52,49,6,8200000
Customer Success,31,34,32,1,4100000
Marketing,14,15,13,1,1900000
G&A (Finance HR Legal IT),19,18,17,0,2800000
Total,232,247,230,18,34300000
`,
  );

  await writeText(
    "04-HR/Executive-Team-Bios.txt",
    `HELIX ANALYTICS — EXECUTIVE TEAM BIOS (PUBLIC VERSION)

David Chen — Chief Executive Officer
Former VP Product at Tableau. Joined Helix as CEO in 2019. Stanford MBA.

Elena Vasquez — Chief Financial Officer
Previously FP&A Director at Atlassian. Joined 2021. CPA.

Marcus Okonkwo — Chief Technology Officer
Co-founder. Led platform architecture from seed stage. 18% equity holder.

Priya Sharma — VP Sales
Built enterprise sales motion 2020-2023. Quota attainment 94% in FY2023.

James Whitfield — General Counsel (fractional, 0.5 FTE)
Partner at Morrison & Callahan LLP. Engaged since Series A.

Board Observers: Horizon Ventures (Series B lead), Apex Capital (Series A)
`,
  );

  await writeText(
    "05-Commercial/Top-25-Customers-ARR.csv",
    `Rank,Customer,Industry,ARR USD,% of Total ARR,Contract End,Renewal Risk
1,Meridian Financial Group,Financial Services,4600000,12.0,2025-03-31,Medium — pricing review
2,Northwind Logistics,Transportation,2100000,5.5,2024-08-15,High — disputed invoice
3,Cascade Health Systems,Healthcare,1980000,5.2,2024-11-30,High — past due AR
4,Brightline Retail Co,Retail,1620000,4.2,2025-06-30,Low
5,Summit Manufacturing,Industrial,1440000,3.8,2024-04-01,Critical — collections
6,Harbor Insurance Group,Insurance,1210000,3.2,2025-01-15,Low
7,Pacific Biotech Ltd,Life Sciences,980000,2.6,2024-09-30,Medium
8,Vertex Capital Advisors,Financial Services,870000,2.3,2025-12-31,Low
9,Greenfield Energy Co,Energy,820000,2.1,2024-07-31,Medium
10,Atlas Education Network,EdTech,790000,2.1,2025-05-15,Low
11-25,(aggregated),Mixed,9120000,23.8,Various,—
Total Top 25,,,38300000,100.0,,
`,
  );

  await writeText(
    "05-Commercial/Customer-Churn-Analysis-2023.txt",
    `HELIX ANALYTICS — CUSTOMER CHURN ANALYSIS FY2023
Prepared by: Customer Success Leadership

Logo Churn: 6.2% (down from 8.1% in FY2022)
Dollar Churn (Gross): 4.8%
Net Revenue Retention: 112%

Notable Churn Events
- Q2: Lost DataStream Media ($380K ARR) — acquired by competitor QuantaBI
- Q3: Lost Forge Industrial ($290K ARR) — budget freeze, cited incomplete SOC2 letter
- Q4: Lost 2 mid-market accounts ($140K combined) — product fit (missing EU data residency)

At-Risk Pipeline (CS flagged, not yet churned)
- Northwind Logistics — $2.1M ARR — payment dispute + executive sponsor departed
- Summit Manufacturing — $1.44M ARR — 138 days overdue, legal escalation

Upside
- Meridian Financial expansion opportunity: +$800K if analytics module adopted (in proposal)

DISCREPANCY NOTE FOR REVIEW
Sales deck (Nov 2023 investor update) cites 24% YoY ARR growth and 118% NRR.
Finance MD&A in data room shows 18.4% growth and 112% NRR. CS leadership confirms
finance figures are accurate for audited reporting.
`,
  );

  await writeText(
    "06-Corporate-Governance/Board-Minutes-2023-Q4-Excerpt.txt",
    `HELIX ANALYTICS, INC.
BOARD OF DIRECTORS — MEETING MINUTES (EXCERPT)
Date: December 12, 2023 | Location: Austin HQ + Zoom

Present: David Chen (CEO), Elena Vasquez (CFO), Marcus Okonkwo (CTO),
         Board members: Sarah Lin (Horizon), Tom Reyes (Apex), Independent: Diane Park

7. RELATED PARTY TRANSACTION — APPROVED
Resolved: The Board approved a pilot engagement with NovaInsight Labs for embedded
analytics proof-of-concept, not to exceed $120,000. Disclosure: NovaInsight's founder
is the spouse of CEO David Chen. Engagement to be conducted at arm's length with
competitive quotes (2 additional bids obtained). CFO to report outcomes Q1 2024.

8. STRATEGIC ALTERNATIVES
CEO presented inbound interest from two strategic acquirers. Board authorized engagement
of Goldman Sachs as financial advisor subject to fee cap. Management to prepare data room
by February 2024.

9. AWS CONTRACT
CTO reported renewal discussions should begin no later than Q4 2023 — item deferred to
January 2024 special session due to time constraints.

Minutes recorded by: Corporate Secretary (fractional)
`,
  );

  await writePdf("07-Investor-Materials/Investor-Update-Nov-2023.pdf", [
    [
      "HELIX ANALYTICS — INVESTOR UPDATE",
      "November 2023 | CONFIDENTIAL",
      "",
      "Highlights",
      "- ARR: $38.3M (+24% YoY) ***",
      "- Net Revenue Retention: 118% ***",
      "- Cash runway: 30+ months",
      "- Enterprise logos: 210+",
      "",
      "*** Note: Figures marked with asterisks reflect management operational metrics",
      "including early renewals and projected expansions. Audited GAAP figures may differ.",
      "",
      "Product",
      "- Shipped EU data residency beta (GA targeted Q2 2024)",
      "- Embedded analytics API revenue +28% YoY",
      "",
      "Ask",
      "- Exploring strategic partnerships and Series C / M&A options in H1 2024",
    ],
  ]);

  await writeText(
    "README.md",
    `# Helix Analytics — Demo Data Room

Fictional M&A diligence files for **Helix Analytics, Inc.** (B2B analytics SaaS, ~$38.3M ARR).

Use these to demo bulk upload, folder structure preservation, and future AI agent analysis.
Several files contain intentional inconsistencies for contradiction detection (e.g. investor deck
vs. audited financials, AR aging vs. management narrative).

## Upload walkthrough

1. Create an **M&A** project in NexusIQ.
2. Open **Data Room** → **Upload**.
3. Drag the entire \`demo/data-room\` folder (or select all files).
4. Folder paths (\`01-Financials\`, \`02-Legal\`, etc.) are preserved on bulk upload.

## Regenerate files

\`\`\`bash
pnpm exec tsx scripts/generate-demo-data-room.ts
\`\`\`

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
`,
  );

  console.log(`Demo data room files written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
