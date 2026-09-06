import type { AIProvider } from "@/lib/ai/provider";
import { openAIProvider } from "@/lib/ai/providers/openai";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

const PROVIDERS: Record<"OPENAI" | "ANTHROPIC" | "GEMINI", AIProvider> = {
  OPENAI: openAIProvider,
  ANTHROPIC: anthropicProvider,
  GEMINI: geminiProvider,
};

export function getAIProvider(provider: keyof typeof PROVIDERS): AIProvider {
  return PROVIDERS[provider];
}

// Which credential an AI-triggered action uses is no longer something the
// person doing the action picks per-click — it's whatever's configured in
// Settings. A workspace only ever has one active credential in practice
// (Settings doesn't offer a "default" toggle among several), so "oldest
// active one" is a stable, deterministic choice rather than an arbitrary one.
export async function getDefaultAIProviderCredential(workspaceId: string) {
  const credential = await db.aIProviderCredential.findFirst({
    where: { workspaceId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!credential) return null;

  return {
    providerName: credential.provider,
    model: credential.model,
    apiKey: decrypt(credential.apiKeyEncrypted),
    provider: getAIProvider(credential.provider),
  };
}
