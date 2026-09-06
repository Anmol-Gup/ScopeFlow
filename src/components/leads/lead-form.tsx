"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ActionState } from "@/server/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_SOURCES, LEAD_PRIORITIES } from "@/lib/leads/constants";

export type LeadFormDefaults = {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  source: string;
  industry: string;
  initialRequirement: string;
  estimatedBudget: string;
  expectedTimeline: string;
  ownerId: string;
  priority: string;
  notes: string;
};

const EMPTY_DEFAULTS: LeadFormDefaults = {
  name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  source: "MANUAL",
  industry: "",
  initialRequirement: "",
  estimatedBudget: "",
  expectedTimeline: "",
  ownerId: "",
  priority: "MEDIUM",
  notes: "",
};

export function LeadForm({
  action,
  defaults = EMPTY_DEFAULTS,
  members,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: LeadFormDefaults;
  members: { id: string; label: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // Default open when editing a lead that already has secondary-field data,
  // so existing values are never hidden behind a collapsed disclosure.
  const [moreOpen, setMoreOpen] = useState(
    () =>
      !!(
        defaults.phone ||
        defaults.website ||
        defaults.industry ||
        defaults.estimatedBudget ||
        defaults.expectedTimeline ||
        defaults.notes
      )
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={defaults.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" defaultValue={defaults.email} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" defaultValue={defaults.company} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source">Source</Label>
            <Select name="source" defaultValue={defaults.source}>
              <SelectTrigger id="source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select name="priority" defaultValue={defaults.priority}>
              <SelectTrigger id="priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="ownerId">Lead owner</Label>
            <Select name="ownerId" defaultValue={defaults.ownerId || undefined}>
              <SelectTrigger id="ownerId" className="w-full">
                <SelectValue placeholder="Unassigned">
                  {(v: string | null) => (v ? members.find((m) => m.id === v)?.label ?? v : "Unassigned")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="initialRequirement">Initial requirement</Label>
            <Textarea
              id="initialRequirement"
              name="initialRequirement"
              rows={3}
              placeholder="A short summary of what the client is asking for"
              defaultValue={defaults.initialRequirement}
            />
          </div>
        </CardContent>
      </Card>

      <div>
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ChevronDown className={`size-4 transition-transform duration-150 ${moreOpen ? "rotate-180" : ""}`} />
          More details
          <span className="font-normal text-placeholder">
            (phone, website, industry, budget, timeline, notes)
          </span>
        </button>
        {moreOpen && (
          <Card className="mt-3">
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={defaults.phone} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" defaultValue={defaults.website} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" defaultValue={defaults.industry} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="estimatedBudget">Estimated budget (₹)</Label>
                <Input
                  id="estimatedBudget"
                  name="estimatedBudget"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={defaults.estimatedBudget}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="expectedTimeline">Expected timeline</Label>
                <Input
                  id="expectedTimeline"
                  name="expectedTimeline"
                  placeholder="e.g. 3 months"
                  defaultValue={defaults.expectedTimeline}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} defaultValue={defaults.notes} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
