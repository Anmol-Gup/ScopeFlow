"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect } from "react";
import {
  saveProviderCredentialAction,
  testProviderCredentialAction,
  deleteProviderCredentialAction,
  type ActionState,
} from "@/server/actions/ai-providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProviderCredential = {
  provider: "OPENAI" | "ANTHROPIC" | "GEMINI";
  model: string;
  maskedKey: string;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
};

const PROVIDER_LABELS: Record<ProviderCredential["provider"], string> = {
  OPENAI: "OpenAI",
  ANTHROPIC: "Anthropic",
  GEMINI: "Gemini",
};

function useToastOnResult(state: ActionState) {
  useEffect(() => {
    if (state?.message) toast.success(state.message);
    if (state?.error) toast.error(state.error);
  }, [state]);
}

function AddProviderForm() {
  const [state, formAction, pending] = useActionState(saveProviderCredentialAction, undefined);
  useToastOnResult(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add / update a provider</CardTitle>
        <CardDescription>
          Your key is encrypted at rest and never sent to the browser again after saving.
        </CardDescription>
      </CardHeader>
      <form action={formAction} className="contents">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="provider">Provider</Label>
            <Select name="provider" defaultValue="ANTHROPIC">
              <SelectTrigger id="provider" className="w-full">
                <SelectValue>
                  {(value: ProviderCredential["provider"] | null) =>
                    value ? PROVIDER_LABELS[value] : "Select a provider"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANTHROPIC">Anthropic</SelectItem>
                <SelectItem value="OPENAI">OpenAI</SelectItem>
                <SelectItem value="GEMINI">Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" placeholder="e.g. claude-haiku-4-5" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="apiKey">API key</Label>
            <PasswordInput id="apiKey" name="apiKey" autoComplete="off" required />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ProviderRow({ credential }: { credential: ProviderCredential }) {
  const [state, testAction, pending] = useActionState(testProviderCredentialAction, undefined);
  useToastOnResult(state);

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{PROVIDER_LABELS[credential.provider]}</span>
          <Badge variant="outline">{credential.model}</Badge>
          {credential.lastTestOk === true && <Badge>Verified</Badge>}
          {credential.lastTestOk === false && <Badge variant="destructive">Failed</Badge>}
        </div>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="size-3.5" />
          {credential.maskedKey} · encrypted at rest
        </span>
      </div>
      <div className="flex items-center gap-2">
        <form action={testAction}>
          <input type="hidden" name="provider" value={credential.provider} />
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {pending ? "Testing…" : "Test"}
          </Button>
        </form>
        <form action={deleteProviderCredentialAction}>
          <input type="hidden" name="provider" value={credential.provider} />
          <Button type="submit" variant="ghost" size="sm">
            Delete
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AIProviderSettings({ credentials }: { credentials: ProviderCredential[] }) {
  return (
    <div className="flex flex-col gap-6">
      {credentials.length > 0 && (
        <div className="flex flex-col gap-2">
          {credentials.map((credential) => (
            <ProviderRow key={credential.provider} credential={credential} />
          ))}
        </div>
      )}
      <AddProviderForm />
    </div>
  );
}
