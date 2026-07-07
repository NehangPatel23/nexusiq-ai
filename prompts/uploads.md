# Prompt: Uploads

**Version:** 1.0.0  
**Feature:** uploads  
**Purpose:** File upload and staging

## Inputs
- Multipart file data
- Project context

## Outputs
- File on local filesystem
- Document record with PENDING status

## Constraints
- Max 50MB per file
- Allowed MIME types only
- Trigger processing pipeline after save
- Never use cloud storage

## Citation Rules
N/A
