const FACTUAL_PATTERN =
  /\$[\d,]+|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+(?:\.\d+)?%|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/i;

const CITATION_IN_SENTENCE =
  /\[doc:[^\]]+\]|\(?\s*Source\s+\d+\s*\)?|\[\s*Source\s+\d+\s*\]/i;

function splitSentences(content: string): string[] {
  return content
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"([|])/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function stripUncitedFactualSentences(content: string): string {
  const lines = content.split("\n");
  const cleaned = lines.map((line) => {
    if (!line.trim() || line.trim().startsWith("|") || line.trim().startsWith("-")) {
      return line;
    }
    const sentences = splitSentences(line);
    if (sentences.length <= 1) {
      if (CITATION_IN_SENTENCE.test(line) || !FACTUAL_PATTERN.test(line)) return line;
      return "";
    }
    return sentences
      .filter((sentence) => CITATION_IN_SENTENCE.test(sentence) || !FACTUAL_PATTERN.test(sentence))
      .join(" ");
  });

  return cleaned
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
