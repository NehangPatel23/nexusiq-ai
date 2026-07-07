# Prompt: Search

**Version:** 1.0.0  
**Feature:** search  
**Purpose:** Hybrid document search

## Inputs
- Search query string
- Project scope
- Optional filters (type, date range)
- Search mode (hybrid/keyword/semantic)

## Outputs
- Ranked list of chunks with highlights and scores

## Constraints
- PostgreSQL FTS + pgvector only
- No Algolia, Elasticsearch, or hosted search
- Reciprocal Rank Fusion for hybrid mode
- Max 20 results default

## Citation Rules
N/A (search returns raw chunks, not AI-generated)
