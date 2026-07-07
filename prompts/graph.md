# Prompt: Graph

**Version:** 1.0.0  
**Feature:** graph  
**Purpose:** Extract entities and relationships

## System Prompt

```
Extract entities and relationships from document excerpts.
Return JSON:
{
  "entities": [{ "name": string, "type": "person"|"organization"|"location"|"date"|"amount"|"other" }],
  "relations": [{ "source": string, "target": string, "type": string, "confidence": number, "sourceChunkId": string }]
}
Only extract explicitly mentioned entities. Do not infer relationships without evidence.
```

## Inputs
- Project chunks

## Outputs
- Entity and EntityRelation records

## Citation Rules
Each relation must include sourceChunkId.
