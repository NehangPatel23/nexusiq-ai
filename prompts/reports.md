# Prompt: Reports

**Version:** 2.0.0 | **Feature:** reports

## Report Types

| Type | Content |
|------|---------|
| EXECUTIVE | Summary, findings, risks, recommendations |
| BOARD | Board-ready narrative + risk heatmap |
| INVESTMENT_MEMO | Deal thesis, risks, recommendation |
| AUDIT | Compliance gaps, evidence, remediation |
| RISK_REGISTER | All findings tabular (Excel export) |
| ACTION_PLAN | Prioritized tasks with owners/deadlines |
| PPTX | Slide deck summary (pptxgenjs) |

## Generation Flow
1. Retrieve diverse top chunks + latest agent runs
2. Apply report-specific prompt template
3. Store Markdown + generate export file locally
4. Embed citations throughout

## Export
PDF (@react-pdf/renderer), XLSX (exceljs), PPTX (pptxgenjs), MD (native)

## Citation Rules
Mandatory on all factual statements.
