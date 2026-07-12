export function getProcessingErrorHint(errorMessage?: string | null): string {
  if (!errorMessage) {
    return "Try reprocessing the document. If the issue persists, check the worker logs.";
  }

  const message = errorMessage.toLowerCase();

  if (message.includes("ollama") && message.includes("unreachable")) {
    return "Start Ollama locally (`ollama serve`) or run the processing worker with `pnpm worker:process`.";
  }
  if (message.includes("no extractable text")) {
    return "Re-upload as TXT/MD, or use a PDF with a selectable text layer. Scanned PDFs may need OCR.";
  }
  if (message.includes("embedding")) {
    return "Verify `OLLAMA_EMBED_MODEL` is pulled (`ollama pull nomic-embed-text`) and Ollama has enough memory.";
  }
  if (message.includes("processing failed")) {
    return "Open the document preview for details, then use Reprocess after fixing the issue.";
  }

  return "Use Reprocess after resolving the issue, or check worker logs for more detail.";
}

export function formatProcessingError(errorMessage?: string | null): string {
  if (!errorMessage) return "Processing failed";
  const hint = getProcessingErrorHint(errorMessage);
  return `${errorMessage} — ${hint}`;
}
