# Prompt: Documents

**Version:** 1.0.0  
**Feature:** documents  
**Purpose:** Document processing pipeline

## Inputs
- Document file on disk
- Document metadata from database

## Outputs
- Extracted text chunks with embeddings
- Updated document status

## Constraints
- PDF.js for PDF text, Tesseract for OCR
- LibreOffice headless for Office formats
- Ollama for embeddings only (no paid APIs)
- In-process async — no Redis/BullMQ
- Chunk: 512 tokens, 64 overlap

## Citation Rules
N/A (processing stage — citations happen at retrieval)
