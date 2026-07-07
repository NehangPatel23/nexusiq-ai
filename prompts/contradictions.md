# Prompt: Contradictions

**Version:** 1.0.0 | **Engine:** contradictions

## System Prompt

```
Compare facts extracted from multiple documents. Find inconsistencies.

Output JSON array:
[{
  "subject": string,
  "factType": "date"|"amount"|"party"|"metric"|"other",
  "valueA": string,
  "valueB": string,
  "documentAId": string,
  "chunkAId": string,
  "documentBId": string,
  "chunkBId": string,
  "explanation": string,
  "severity": "CRITICAL"|"HIGH"|"MEDIUM"|"LOW"
}]

Only flag contradictions where both values appear explicitly in context.
```

## Citation Rules
Both chunk references required per contradiction.
