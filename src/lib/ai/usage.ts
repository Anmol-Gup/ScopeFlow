import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type { AIProviderType, AIOperation } from "@/generated/prisma/enums";
import { estimateCostUsd } from "@/lib/ai/cost";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function recordAIUsage(
  db: DbClient,
  params: {
    workspaceId: string;
    provider: AIProviderType;
    model: string;
    operation: AIOperation;
    inputTokens?: number;
    outputTokens?: number;
  }
) {
  return db.aIUsage.create({
    data: {
      workspaceId: params.workspaceId,
      provider: params.provider,
      model: params.model,
      operation: params.operation,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      estimatedCost: estimateCostUsd(params.model, params.inputTokens, params.outputTokens),
    },
  });
}
