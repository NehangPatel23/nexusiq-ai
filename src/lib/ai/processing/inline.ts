export function shouldRunInlineProcessing(): boolean {
  if (process.env.VERCEL) return false;
  return process.env.ENABLE_INLINE_PROCESSING === "true";
}

export function scheduleDocumentProcessing(documentId: string): void {
  if (!shouldRunInlineProcessing()) return;

  void import("./pipeline")
    .then(({ processDocument, markDocumentProcessing }) =>
      markDocumentProcessing(documentId).then((claimed) => {
        if (!claimed) return;
        return processDocument(documentId);
      }),
    )
    .catch((error) => {
      console.error("[processing] inline processing failed", documentId, error);
    });
}
