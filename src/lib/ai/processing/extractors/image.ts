import { createWorker } from "tesseract.js";

export async function extractImageText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(buffer);
    const text = result.data.text.trim();
    return { text, pageCount: text ? 1 : 0 };
  } finally {
    await worker.terminate();
  }
}
