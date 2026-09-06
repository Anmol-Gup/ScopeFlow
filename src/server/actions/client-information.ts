"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";
import { getDefaultAIProviderCredential } from "@/lib/ai";
import { recordAIUsage } from "@/lib/ai/usage";
import { toSafeProviderErrorMessage } from "@/lib/ai/errors";

export type ActionState = { error?: string; message?: string } | undefined;
export type ParaphraseState = { requirement?: string; error?: string };

// A single requirement per submission, always — AI here is a wording
// assist, never an extraction step. Preserves the exact submitted text as
// an OriginalInquiry too (never lose what was actually typed).
export async function addRequirementAction(
  projectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    include: { lead: { select: { id: true } } },
  });
  if (!project) return { error: "Project not found" };

  const parsed = z
    .object({ content: z.string().trim().min(1, "Type a requirement first") })
    .safeParse({ content: formData.get("content") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.$transaction(async (tx) => {
    await tx.originalInquiry.create({
      data: { projectId, contentType: "OTHER", content: parsed.data.content },
    });
    await tx.requirement.create({
      data: {
        projectId,
        category: "FUNCTIONAL",
        requirement: parsed.data.content,
        status: "PENDING_APPROVAL",
        priority: "MEDIUM",
        confidence: "HIGH",
      },
    });
    await logActivity(tx, {
      workspaceId,
      leadId: project.leadId,
      projectId,
      type: "requirement.added",
      description: "Requirement added",
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/requirements`);
  return { message: "Requirement added" };
}

// Called directly from the client (no <form>, no page reload) — rewrites
// the in-progress text in place and hands it back for the caller to drop
// into the same textarea. Never writes anything to the database itself.
export async function paraphraseRequirementAction(
  projectId: string,
  text: string
): Promise<ParaphraseState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const project = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) return { error: "Project not found" };

  const trimmed = text.trim();
  if (!trimmed) return { error: "Type a requirement first" };

  const credential = await getDefaultAIProviderCredential(workspaceId);
  if (!credential) {
    return { error: "No AI provider is configured. Add one in Settings first." };
  }

  try {
    const result = await credential.provider.paraphraseRequirement(credential.apiKey, credential.model, {
      requirement: trimmed,
    });
    await recordAIUsage(db, {
      workspaceId,
      provider: credential.providerName,
      model: credential.model,
      operation: "PARAPHRASE_REQUIREMENT",
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });
    return { requirement: result.data.requirement };
  } catch (error) {
    return { error: toSafeProviderErrorMessage(error) };
  }
}
