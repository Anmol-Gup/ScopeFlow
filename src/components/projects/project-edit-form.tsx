"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { updateProjectAction, type ActionState } from "@/server/actions/projects";
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
import { PROJECT_STATUSES, projectStatusLabel } from "@/lib/projects/constants";

export type ProjectDefaults = {
  name: string;
  overview: string;
  timeline: string;
  budget: string;
  status: string;
};

export function ProjectEditForm({
  projectId,
  defaults,
  cancelHref,
}: {
  projectId: string;
  defaults: ProjectDefaults;
  cancelHref: string;
}) {
  const action = updateProjectAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldsDirty, setFieldsDirty] = useState(false);
  // Tracked separately from the plain inputs above — Base UI's Select fires
  // onValueChange before its own hidden input's value actually updates, so
  // reading FormData synchronously inside that callback sees the stale
  // value. Comparing the callback's own argument sidesteps that race.
  const [statusDirty, setStatusDirty] = useState(false);
  const isDirty = fieldsDirty || statusDirty;

  const initialValues = useMemo(
    () => ({
      name: defaults.name,
      overview: defaults.overview,
      timeline: defaults.timeline,
      budget: defaults.budget,
    }),
    [defaults]
  );

  function checkDirty() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const changed = Object.entries(initialValues).some(
      ([key, value]) => (data.get(key) ?? "") !== value
    );
    setFieldsDirty(changed);
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={checkDirty}
      className="flex flex-col gap-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={defaults.name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                defaultValue={defaults.status}
                onValueChange={(v) => setStatusDirty(v !== defaults.status)}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue>
                    {(v: string | null) => (v ? projectStatusLabel(v as never) : "Status")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="budget">Budget (₹)</Label>
              <Input id="budget" name="budget" type="number" min="0" step="1" defaultValue={defaults.budget} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="timeline">Timeline</Label>
            <Input id="timeline" name="timeline" defaultValue={defaults.timeline} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="overview">Overview</Label>
            <Textarea id="overview" name="overview" rows={6} defaultValue={defaults.overview} />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={cancelHref}>Cancel</Link>}
        />
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
