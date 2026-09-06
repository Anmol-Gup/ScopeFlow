import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function logActivity(
  db: DbClient,
  params: {
    workspaceId: string;
    leadId?: string;
    projectId?: string;
    type: string;
    description: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return db.activity.create({
    data: {
      workspaceId: params.workspaceId,
      leadId: params.leadId,
      projectId: params.projectId,
      type: params.type,
      description: params.description,
      metadata: params.metadata,
    },
  });
}
