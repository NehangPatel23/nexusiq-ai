export function buildChatTitle(userContent: string): string {
  const normalized = userContent.replace(/\s+/g, " ").trim();
  if (!normalized) return "New chat";

  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0] ?? normalized;
  const candidate = firstSentence.length > 72 ? normalized : firstSentence;
  if (candidate.length <= 72) {
    return candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }

  const truncated = candidate.slice(0, 72);
  const lastSpace = truncated.lastIndexOf(" ");
  const title = (lastSpace > 24 ? truncated.slice(0, lastSpace) : truncated).trim();
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}…`;
}
