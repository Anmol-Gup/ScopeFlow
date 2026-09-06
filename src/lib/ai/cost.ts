// Approximate USD list price per 1M tokens, for the AI Usage screen only.
// Real billing always comes directly from the provider under the user's own
// key (BYOK) — this is an estimate, never authoritative. An unrecognized
// model returns null rather than a guessed number.
const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-opus-4-5": { input: 15, output: 75 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
};

export function estimateCostUsd(
  model: string,
  inputTokens?: number | null,
  outputTokens?: number | null
): number | null {
  const pricing = PRICING_PER_MILLION_TOKENS[model];
  if (!pricing) return null;
  const inputCost = ((inputTokens ?? 0) / 1_000_000) * pricing.input;
  const outputCost = ((outputTokens ?? 0) / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
