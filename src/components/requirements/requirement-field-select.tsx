"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateRequirementQuickFieldAction } from "@/server/actions/requirements";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RequirementFieldSelect({
  requirementId,
  field,
  value,
  options,
}: {
  requirementId: string;
  field: "status" | "priority";
  value: string;
  options: { value: string; label: string }[];
}) {
  const [current, setCurrent] = useState(value);
  const formRef = useRef<HTMLFormElement>(null);
  const isFirstRender = useRef(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    startTransition(() => {
      formRef.current?.requestSubmit();
    });
  }, [current, startTransition]);

  return (
    <form ref={formRef} action={updateRequirementQuickFieldAction}>
      <input type="hidden" name="requirementId" value={requirementId} />
      <input type="hidden" name="field" value={field} />
      <Select
        name="value"
        value={current}
        onValueChange={(next) => setCurrent(next as string)}
        disabled={pending}
      >
        <SelectTrigger size="sm" className="w-fit">
          <SelectValue>
            {(v: string | null) => (v ? options.find((o) => o.value === v)?.label ?? v : "—")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
