import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RequirementFieldSelect } from "@/components/requirements/requirement-field-select";
import { RequirementFormDialog } from "@/components/requirements/requirement-form-dialog";
import { DeleteRequirementButton } from "@/components/requirements/delete-requirement-button";
import { REQUIREMENT_STATUSES } from "@/lib/requirements/constants";
import type { RequirementScopeInfo } from "@/lib/requirements/scope";

type RequirementRow = {
  id: string;
  category: string;
  requirement: string;
  status: string;
  priority: string;
  confidence: string;
  evidence: string | null;
  notes: string | null;
};

export function RequirementTable({
  items,
  scopeMap,
  lockedRequirementIds,
  contentLockedIds,
}: {
  items: RequirementRow[];
  scopeMap?: Map<string, RequirementScopeInfo>;
  lockedRequirementIds?: string[];
  // Ids already part of any proposal version — editing their text/category
  // is a no-op that can never reach the client (see updateRequirementAction).
  contentLockedIds?: string[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None yet.</p>;
  }

  const lockedIds = new Set(lockedRequirementIds);
  const contentLocked = new Set(contentLockedIds);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const scope = scopeMap?.get(item.id)?.scope;
        return (
        <div key={item.id} className="rounded-lg border p-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm">{item.requirement}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <RequirementFormDialog
                mode="edit"
                requirementId={item.id}
                defaults={{
                  category: item.category,
                  requirement: item.requirement,
                  status: item.status,
                  priority: item.priority,
                  confidence: item.confidence,
                  evidence: item.evidence ?? "",
                  notes: item.notes ?? "",
                }}
                trigger={{ content: <Pencil />, variant: "ghost", size: "icon-sm" }}
                contentLocked={contentLocked.has(item.id)}
              />
              <DeleteRequirementButton requirementId={item.id} locked={lockedIds.has(item.id)} />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RequirementFieldSelect
              requirementId={item.id}
              field="status"
              value={item.status}
              options={REQUIREMENT_STATUSES}
            />
            {scope === "ORIGINAL" && <Badge variant="success">Original Scope</Badge>}
            {scope === "ADDITIONAL" && <Badge variant="info">Additional Scope</Badge>}
          </div>
        </div>
        );
      })}
    </div>
  );
}
