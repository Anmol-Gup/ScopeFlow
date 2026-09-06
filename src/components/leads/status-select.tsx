"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateLeadStatusAction } from "@/server/actions/leads";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES, leadStatusLabel } from "@/lib/leads/constants";
import type { LeadStatus } from "@/generated/prisma/enums";

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [value, setValue] = useState<LeadStatus>(status);
  const formRef = useRef<HTMLFormElement>(null);
  const isFirstRender = useRef(true);
  const [pending, startTransition] = useTransition();

  // The hidden <input> that carries `value` to the form only reflects the new
  // value after this state update commits — submitting inside the change
  // handler itself would read the stale DOM value, so submit from an effect.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    startTransition(() => {
      formRef.current?.requestSubmit();
    });
  }, [value, startTransition]);

  return (
    <form ref={formRef} action={updateLeadStatusAction}>
      <input type="hidden" name="leadId" value={leadId} />
      <Select
        name="status"
        value={value}
        onValueChange={(next) => setValue(next as LeadStatus)}
        disabled={pending}
      >
        <SelectTrigger size="sm" className="w-fit">
          <SelectValue>
            {(v: LeadStatus | null) => (v ? leadStatusLabel(v) : "Set status")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false} className="w-auto min-w-44">
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
