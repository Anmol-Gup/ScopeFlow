import { AIProviderSettings } from "@/components/settings/ai-provider-settings";
import { AIUsageSummary } from "@/components/settings/ai-usage-summary";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import { maskApiKey, decrypt } from "@/lib/encryption";

export default async function AIProvidersPage() {
  const { workspaceId } = await requireWorkspaceAccess();
  const [credentials, usageAgg, usageByOperation] = await Promise.all([
    db.aIProviderCredential.findMany({ where: { workspaceId }, orderBy: { provider: "asc" } }),
    db.aIUsage.aggregate({
      where: { workspaceId },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
    }),
    db.aIUsage.groupBy({
      by: ["operation"],
      where: { workspaceId },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true },
    }),
  ]);

  const maskedCredentials = credentials.map((credential) => ({
    provider: credential.provider,
    model: credential.model,
    maskedKey: maskApiKey(decrypt(credential.apiKeyEncrypted)),
    lastTestedAt: credential.lastTestedAt?.toISOString() ?? null,
    lastTestOk: credential.lastTestOk,
  }));

  return (
    <div className="flex flex-col gap-6">
      <p className="-mt-2 text-sm text-muted-foreground">
        Bring your own AI provider key — usage is billed directly by that provider to you.
      </p>
      <AIProviderSettings credentials={maskedCredentials} />
      <AIUsageSummary
        totalOperations={usageAgg._count._all}
        totalInputTokens={usageAgg._sum.inputTokens ?? 0}
        totalOutputTokens={usageAgg._sum.outputTokens ?? 0}
        totalEstimatedCost={Number(usageAgg._sum.estimatedCost ?? 0)}
        byOperation={usageByOperation.map((row) => ({
          operation: row.operation,
          count: row._count._all,
          inputTokens: row._sum.inputTokens ?? 0,
          outputTokens: row._sum.outputTokens ?? 0,
        }))}
      />
    </div>
  );
}
