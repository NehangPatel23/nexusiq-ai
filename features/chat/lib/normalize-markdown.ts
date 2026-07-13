const TABLE_ROW = /^\s*\|.+\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

function isTableLine(line: string): boolean {
  return TABLE_ROW.test(line) || TABLE_SEPARATOR.test(line);
}

function splitEmbeddedTableLine(line: string): string[] | null {
  if (line.trim().startsWith("|") || !line.includes("|")) return null;

  const pipeIndex = line.indexOf("|");
  const before = line.slice(0, pipeIndex).trimEnd();
  const tablePart = line.slice(pipeIndex).trim();
  if (!before || !tablePart.includes("|")) return null;

  return [before, "", tablePart];
}

export function normalizeAssistantMarkdown(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const embedded = splitEmbeddedTableLine(lines[index] ?? "");
    if (embedded) {
      if (result.length > 0 && result[result.length - 1] !== "") {
        result.push("");
      }
      result.push(...embedded);
      continue;
    }

    const line = lines[index] ?? "";
    const tableLine = isTableLine(line);
    const previous = result[result.length - 1];
    const previousIsTable = previous !== undefined && isTableLine(previous);

    if (tableLine && previous !== undefined && previous !== "" && !previousIsTable) {
      result.push("");
    }

    result.push(line);

    const next = lines[index + 1];
    const nextIsTable = next !== undefined && isTableLine(next);
    if (tableLine && next !== undefined && next.trim() !== "" && !nextIsTable) {
      result.push("");
    }
  }

  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
