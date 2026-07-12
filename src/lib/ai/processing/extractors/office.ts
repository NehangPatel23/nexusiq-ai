import { extractOfficeText } from "@/features/data-room/lib/office-text";
import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function extractWithLibreOffice(buffer: Buffer, extension: string): Promise<string | null> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nexusiq-office-"));
  const inputPath = path.join(tmpDir, `input.${extension}`);

  try {
    await writeFile(inputPath, buffer);
    await execFileAsync("soffice", [
      "--headless",
      "--convert-to",
      "txt:Text",
      "--outdir",
      tmpDir,
      inputPath,
    ], { timeout: 60_000 });

    const outputPath = path.join(tmpDir, "input.txt");
    const text = await readFile(outputPath, "utf8");
    return text.trim() || null;
  } catch {
    return null;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("wordprocessingml")) return "docx";
  if (mimeType.includes("spreadsheetml")) return "xlsx";
  if (mimeType.includes("presentationml")) return "pptx";
  if (mimeType.includes("msword")) return "doc";
  if (mimeType.includes("ms-excel")) return "xls";
  return "bin";
}

export async function extractOfficeDocumentText(
  buffer: Buffer,
  mimeType: string,
): Promise<{ text: string; pageCount: number }> {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  const direct = await extractOfficeText(arrayBuffer, mimeType);
  if (direct && direct.trim()) {
    const text = direct.trim();
    return { text, pageCount: Math.max(1, Math.ceil(text.length / 3000)) };
  }

  const fallback = await extractWithLibreOffice(buffer, extensionForMime(mimeType));
  if (fallback) {
    return { text: fallback, pageCount: Math.max(1, Math.ceil(fallback.length / 3000)) };
  }

  return { text: "", pageCount: 0 };
}
