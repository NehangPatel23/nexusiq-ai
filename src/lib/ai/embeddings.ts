import { getOllamaClient, type OllamaClient } from "./ollama-client";

export async function embedTexts(
  texts: string[],
  client?: OllamaClient,
): Promise<number[][]> {
  const ollama = client ?? getOllamaClient();
  return ollama.embed(texts);
}

export function formatVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
