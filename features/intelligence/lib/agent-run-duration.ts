/**
 * Shared duration for intelligence agent API routes.
 * Pro allows up to 300s; Hobby is capped at 60s by Vercel even if exported higher.
 */
export const AGENT_RUN_MAX_DURATION_SECONDS = 300;

/** Leave headroom so we can fail the DB row before Vercel hard-kills the function. */
export function defaultOllamaChatTimeoutMs(): number {
  const fromEnv = Number(process.env.OLLAMA_CHAT_TIMEOUT_MS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return Math.max(30_000, (AGENT_RUN_MAX_DURATION_SECONDS - 20) * 1000);
}
