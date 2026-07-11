import JSZip from "jszip";

function decodeXmlEntities(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Extract plain text from a DOCX buffer (Office Open XML). */
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return "";

  const paragraphs = docXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) ?? [];
  const lines = paragraphs.map((para) => {
    const runs = para.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [];
    return runs.map((run) => decodeXmlEntities(run.replace(/<\/?w:t[^>]*>/g, ""))).join("");
  });

  return lines.filter(Boolean).join("\n").trim();
}

/** Extract cell text from an XLSX buffer (first sheet). */
export async function extractXlsxText(buffer: ArrayBuffer, maxRows = 200): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  const sheetXml =
    (await zip.file("xl/worksheets/sheet1.xml")?.async("string")) ??
    (await zip.file("xl/worksheets/sheet.xml")?.async("string"));

  if (!sheetXml) return "";

  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const siMatches = sharedStringsXml.match(/<si[\s>][\s\S]*?<\/si>/g) ?? [];
    for (const si of siMatches) {
      const parts = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? [];
      sharedStrings.push(
        parts.map((p) => decodeXmlEntities(p.replace(/<\/?t[^>]*>/g, ""))).join(""),
      );
    }
  }

  const rowMatches = sheetXml.match(/<row[\s>][\s\S]*?<\/row>/g) ?? [];
  const rows: string[][] = [];

  for (const row of rowMatches.slice(0, maxRows)) {
    const cells = row.match(/<c[\s>][\s\S]*?<\/c>/g) ?? [];
    const rowValues: string[] = [];
    for (const cell of cells) {
      const ref = cell.match(/t="([^"]+)"/)?.[1];
      const valueMatch = cell.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (!valueMatch) {
        rowValues.push("");
        continue;
      }
      if (ref === "s") {
        const idx = Number.parseInt(valueMatch, 10);
        rowValues.push(sharedStrings[idx] ?? valueMatch);
      } else {
        rowValues.push(decodeXmlEntities(valueMatch));
      }
    }
    if (rowValues.some(Boolean)) rows.push(rowValues);
  }

  return rows.map((r) => r.join("\t")).join("\n").trim();
}

export async function extractOfficeText(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<string | null> {
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocxText(buffer);
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return extractXlsxText(buffer);
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return extractPptxText(buffer);
  }
  return null;
}

/** Extract slide text from a PPTX buffer (Office Open XML). */
export async function extractPptxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => name.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      const numA = Number.parseInt(a.match(/slide(\d+)/)?.[1] ?? "0", 10);
      const numB = Number.parseInt(b.match(/slide(\d+)/)?.[1] ?? "0", 10);
      return numA - numB;
    });

  const slides: string[] = [];
  for (const slidePath of slideFiles) {
    const xml = await zip.file(slidePath)?.async("string");
    if (!xml) continue;
    const texts = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) ?? [];
    const lines = texts.map((t) => decodeXmlEntities(t.replace(/<\/?a:t[^>]*>/g, "")));
    if (lines.length > 0) {
      slides.push(`--- Slide ${slides.length + 1} ---\n${lines.join("\n")}`);
    }
  }

  return slides.join("\n\n").trim();
}
