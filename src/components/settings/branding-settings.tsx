"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImageOff } from "lucide-react";
import {
  saveBrandingAction,
  removeBrandingLogoAction,
  type ActionState,
} from "@/server/actions/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_ACCENT_COLOR } from "@/lib/branding";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD"] as const;

export type BrandingData = {
  companyName: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyWebsite: string | null;
  address: string | null;
  taxId: string | null;
  currency: string;
  accentColor: string | null;
  paymentTerms: string | null;
  termsAndConditions: string | null;
  hasLogo: boolean;
} | null;

export function BrandingSettings({
  workspaceId,
  workspaceName,
  branding,
}: {
  workspaceId: string;
  workspaceName: string;
  branding: BrandingData;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveBrandingAction, undefined);
  // Remove-logo is a plain button (never a nested <form> — an inner <form>
  // inside the branding-save <form> below is invalid HTML and silently
  // breaks submission), so it's invoked directly as an async function with
  // its own transition instead of useActionState.
  const [removePending, startRemoveTransition] = useTransition();
  // Controlled only where a live preview needs them — keeps the rest of the
  // form as simple uncontrolled inputs like every other settings form.
  const [companyName, setCompanyName] = useState(branding?.companyName ?? "");
  const [companyEmail, setCompanyEmail] = useState(branding?.companyEmail ?? "");
  const [companyPhone, setCompanyPhone] = useState(branding?.companyPhone ?? "");
  const [companyWebsite, setCompanyWebsite] = useState(branding?.companyWebsite ?? "");
  const [address, setAddress] = useState(branding?.address ?? "");
  const [accentColor, setAccentColor] = useState(branding?.accentColor || DEFAULT_ACCENT_COLOR);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    branding?.hasLogo ? `/api/branding/${workspaceId}/logo` : null
  );
  const [hasLogo, setHasLogo] = useState(branding?.hasLogo ?? false);

  useEffect(() => {
    if (state?.message) toast.success(state.message);
    if (state?.error) toast.error(state.error);
  }, [state]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreviewUrl(URL.createObjectURL(file));
    setHasLogo(true);
  }

  function handleRemoveLogo() {
    startRemoveTransition(async () => {
      const result = await removeBrandingLogoAction();
      if (result?.message) {
        toast.success(result.message);
        setLogoPreviewUrl(null);
        setHasLogo(false);
      }
      if (result?.error) toast.error(result.error);
    });
  }

  const contactLine = [companyEmail, companyPhone, companyWebsite].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Company branding</CardTitle>
          <CardDescription>
            Configure this once — it appears automatically on every generated proposal and
            quotation.
          </CardDescription>
        </CardHeader>
        {/* Keyed on the saved data so a successful save (which revalidates
            and re-renders this same mounted component with fresh server
            props) remounts the form and resets its uncontrolled fields'
            defaultValue to the new values, instead of leaving them stale. */}
        <form key={JSON.stringify(branding)} action={formAction} className="contents">
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="logo">Company logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
                  {logoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreviewUrl} alt="Logo preview" className="size-full object-contain" />
                  ) : (
                    <ImageOff className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    id="logo"
                    name="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="max-w-xs"
                  />
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">PNG, JPEG, WEBP, or SVG · up to 2MB</p>
                    {hasLogo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={removePending}
                        onClick={handleRemoveLogo}
                      >
                        {removePending ? "Removing…" : "Remove logo"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder={workspaceName}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="companyEmail">Company email</Label>
                <Input
                  id="companyEmail"
                  name="companyEmail"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="companyPhone">Phone</Label>
                <Input
                  id="companyPhone"
                  name="companyPhone"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="companyWebsite">Website</Label>
                <Input
                  id="companyWebsite"
                  name="companyWebsite"
                  placeholder="https://"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Business address</Label>
              <Textarea
                id="address"
                name="address"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="taxId">GST / tax registration number</Label>
                <Input id="taxId" name="taxId" defaultValue={branding?.taxId ?? ""} placeholder="Optional" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="currency">Default currency</Label>
                <Select name="currency" defaultValue={branding?.currency || "INR"}>
                  <SelectTrigger id="currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="accentColorPicker">Brand / accent color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="accentColorPicker"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="size-10 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
                />
                <Input
                  name="accentColor"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="max-w-32"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used on generated documents only — it does not change ScopeFlow&apos;s own interface.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="paymentTerms">Default payment terms</Label>
              <Textarea
                id="paymentTerms"
                name="paymentTerms"
                rows={3}
                defaultValue={branding?.paymentTerms ?? ""}
                placeholder="e.g. 50% upfront, 50% on delivery"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="termsAndConditions">Default terms &amp; conditions</Label>
              <Textarea
                id="termsAndConditions"
                name="termsAndConditions"
                rows={4}
                defaultValue={branding?.termsAndConditions ?? ""}
                placeholder="Shown in the footer of generated proposals and quotations."
              />
            </div>

            {state?.error && (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save branding"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>How this appears on the header of a generated document.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center gap-4 rounded-lg border bg-card p-5"
            style={{ borderTopWidth: 4, borderTopColor: accentColor || DEFAULT_ACCENT_COLOR }}
          >
            {logoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreviewUrl} alt="Logo preview" className="h-12 w-auto max-w-40 object-contain" />
            ) : null}
            <div className="flex flex-col gap-0.5">
              <p className="text-lg font-semibold tracking-tight">{companyName || workspaceName}</p>
              {contactLine && <p className="text-xs text-muted-foreground">{contactLine}</p>}
              {address && <p className="text-xs text-muted-foreground">{address}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
