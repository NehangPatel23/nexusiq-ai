import type { DocumentType } from "@prisma/client";

import { extractImageText } from "./image";
import { extractOfficeDocumentText } from "./office";
import { extractPdfText } from "./pdf";
import { estimatePageCount, extractPlainText } from "./text";

export type ExtractionResult = {
  text: string;
  pageCount: number;
};

export async function extractDocumentText(params: {
  buffer: Buffer;
  mimeType: string;
  type: DocumentType;
}): Promise<ExtractionResult> {
  const { buffer, mimeType, type } = params;

  if (type === "PDF" || mimeType === "application/pdf") {
    const pdf = await extractPdfText(buffer);
    if (pdf.text) return pdf;
    // Scanned PDF — OCR first page via image pipeline when no text layer
    try {
      const ocr = await extractImageText(buffer);
      if (ocr.text) {
        return { text: ocr.text, pageCount: pdf.pageCount || 1 };
      }
    } catch {
      // Tesseract may not support raw PDF bytes
    }
    return pdf;
  }

  if (type === "IMAGE" || mimeType.startsWith("image/")) {
    return extractImageText(buffer);
  }

  if (type === "DOCX" || type === "XLSX" || type === "PPTX" || mimeType.includes("officedocument")) {
    return extractOfficeDocumentText(buffer, mimeType);
  }

  if (type === "TXT" || type === "MD" || type === "CSV" || mimeType.startsWith("text/")) {
    const text = await extractPlainText(buffer, mimeType);
    return { text, pageCount: estimatePageCount(text) };
  }

  const fallback = await extractPlainText(buffer, mimeType);
  return { text: fallback, pageCount: estimatePageCount(fallback) };
}
