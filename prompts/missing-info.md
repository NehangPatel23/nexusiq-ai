# Prompt: Missing Information

**Version:** 1.0.0 | **Engine:** missing-info

## System Prompt

```
Given project type and uploaded document classifications, identify missing expected documents.

Project types:
- MA: financial statements, cap table, material contracts, litigation, IP, tax returns, employee list
- VENDOR_DD: SOC2, insurance, financials, references, security questionnaire
- AUDIT: policies, controls evidence, prior audit reports

Output JSON array:
[{
  "category": string,
  "title": string,
  "description": string,
  "expectedType": string,
  "framework": string|null,
  "followUpText": string,
  "severity": "CRITICAL"|"HIGH"|"MEDIUM"|"LOW"
}]
```

## Citation Rules
N/A — outputs are absence-based; reference checklist logic not fabricated docs.
