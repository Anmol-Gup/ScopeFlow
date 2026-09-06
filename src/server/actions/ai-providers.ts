"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { encrypt, decrypt } from "@/lib/encryption";
import { getAIProvider } from "@/lib/ai";

export type ActionState = { error?: string; message?: string } | undefined;

const saveSchema = z.object({
  provider: z.enum(["OPENAI", "ANTHROPIC", "GEMINI"]),
  apiKey: z.string().trim().min(10, "API key looks too short"),
  model: z.string().trim().min(1, "Model is required"),
});

export async function saveProviderCredentialAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const parsed = saveSchema.safeParse({
    provider: formData.get("provider"),
    apiKey: formData.get("apiKey"),
    model: formData.get("model"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { provider, apiKey, model } = parsed.data;

  await db.aIProviderCredential.upsert({
    where: { workspaceId_provider: { workspaceId, provider } },
    create: {
      workspaceId,
      provider,
      model,
      apiKeyEncrypted: encrypt(apiKey),
    },
    update: {
      model,
      apiKeyEncrypted: encrypt(apiKey),
      lastTestedAt: null,
      lastTestOk: null,
    },
  });

  revalidatePath("/settings/ai-providers");
  return { message: `${provider} credential saved.` };
}

export async function testProviderCredentialAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const provider = String(formData.get("provider") ?? "");

  const credential = await db.aIProviderCredential.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: provider as never } },
  });
  if (!credential) {
    return { error: "No credential saved for this provider yet." };
  }

  const apiKey = decrypt(credential.apiKeyEncrypted);
  const result = await getAIProvider(credential.provider).testConnection(
    apiKey,
    credential.model
  );

  await db.aIProviderCredential.update({
    where: { id: credential.id },
    data: { lastTestedAt: new Date(), lastTestOk: result.ok },
  });

  revalidatePath("/settings/ai-providers");
  return result.ok ? { message: result.message } : { error: result.message };
}

export async function deleteProviderCredentialAction(formData: FormData): Promise<void> {
  const { workspaceId } = await requireWorkspaceAccess();
  const provider = String(formData.get("provider") ?? "");

  await db.aIProviderCredential.deleteMany({
    where: { workspaceId, provider: provider as never },
  });

  revalidatePath("/settings/ai-providers");
}
