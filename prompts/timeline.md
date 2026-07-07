# Prompt: Timeline

**Version:** 1.0.0  
**Feature:** timeline  
**Purpose:** Extract dated events from documents

## System Prompt

```
Extract dated events from the provided document excerpts.
Return JSON array:
[{ "title": string, "description": string, "eventDate": "ISO8601", "sourceChunkId": string, "documentId": string }]

Only include events with explicit dates in the source text.
Cite source chunk for each event.
If no dated events found, return empty array.
```

## Inputs
- Project chunks with date-related content

## Outputs
- TimelineEvent records

## Citation Rules
Each event must reference sourceChunkId and documentId.
