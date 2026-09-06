import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RequirementProjectItem = { id: string; projectName: string; leadName: string; count: number };
type ChangesRequestedItem = {
  id: string;
  projectId: string;
  projectName: string;
  leadName: string;
  version: number;
};
type QuotationAwaitingItem = {
  id: string;
  projectId: string;
  projectName: string;
  leadName: string;
  version: number;
};
type NeedsScopeReviewItem = { id: string; projectName: string; leadName: string; count: number };

export function NeedsAttentionSection({
  changesRequested,
  requirementsNeedingConfirmation,
  quotationsAwaitingResponse,
  needsScopeReview,
}: {
  changesRequested: ChangesRequestedItem[];
  requirementsNeedingConfirmation: RequirementProjectItem[];
  quotationsAwaitingResponse: QuotationAwaitingItem[];
  needsScopeReview: NeedsScopeReviewItem[];
}) {
  const isEmpty =
    changesRequested.length === 0 &&
    requirementsNeedingConfirmation.length === 0 &&
    quotationsAwaitingResponse.length === 0 &&
    needsScopeReview.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs your attention</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle2 className="size-6 text-success" />
            <p className="text-sm font-medium">You&apos;re all caught up.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Nothing needs your attention right now.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {changesRequested.map((proposal) => (
              <li
                key={`chg-${proposal.id}`}
                className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
              >
                <span>
                  Client requested changes to{" "}
                  <Link
                    href={`/projects/${proposal.projectId}/proposal`}
                    className="font-medium underline underline-offset-4"
                  >
                    Proposal V{proposal.version}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    — {proposal.projectName} · {proposal.leadName}
                  </span>
                </span>
                <Link
                  href={`/projects/${proposal.projectId}/proposal`}
                  className="shrink-0 text-primary underline underline-offset-4"
                >
                  Review Changes
                </Link>
              </li>
            ))}
            {requirementsNeedingConfirmation.map((project) => (
              <li
                key={`req-${project.id}`}
                className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
              >
                <span>
                  <Link href={`/projects/${project.id}`} className="font-medium underline underline-offset-4">
                    {project.projectName}
                  </Link>
                  <span className="text-muted-foreground"> · {project.leadName}</span>
                  {" — "}
                  {project.count} requirement{project.count === 1 ? "" : "s"} awaiting approval
                </span>
                <Link
                  href={`/projects/${project.id}/requirements`}
                  className="shrink-0 text-primary underline underline-offset-4"
                >
                  Review Requirements
                </Link>
              </li>
            ))}
            {quotationsAwaitingResponse.map((quotation) => (
              <li
                key={`quo-${quotation.id}`}
                className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
              >
                <span>
                  <Link
                    href={`/projects/${quotation.projectId}/quotation`}
                    className="font-medium underline underline-offset-4"
                  >
                    Quotation V{quotation.version}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    — {quotation.projectName} · {quotation.leadName}
                  </span>
                  {" — awaiting response"}
                </span>
                <Link
                  href={`/projects/${quotation.projectId}/quotation`}
                  className="shrink-0 text-primary underline underline-offset-4"
                >
                  Open Quotation
                </Link>
              </li>
            ))}
            {needsScopeReview.map((project) => (
              <li
                key={`scope-${project.id}`}
                className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
              >
                <span>
                  <Link href={`/projects/${project.id}`} className="font-medium underline underline-offset-4">
                    {project.projectName}
                  </Link>
                  <span className="text-muted-foreground"> · {project.leadName}</span>
                  {" — "}
                  {project.count} new requirement{project.count === 1 ? "" : "s"} ready for an
                  additional proposal
                </span>
                <Link
                  href={`/projects/${project.id}`}
                  className="shrink-0 text-primary underline underline-offset-4"
                >
                  Needs Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
