import { createQuotationShareAction } from "@/server/actions/quotation-share";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton } from "@/components/proposals/copy-link-button";
import { ResendQuotationShareButton } from "@/components/quotations/resend-quotation-share-button";
import { formatDateTime } from "@/lib/format";
import { documentStatusLabel, documentStatusBadgeVariant } from "@/lib/documents/constants";
import type { DocumentStatus } from "@/generated/prisma/enums";

type ShareInfo = {
  token: string;
  status: DocumentStatus;
  viewCount: number;
  firstViewedAt: Date | null;
  lastViewedAt: Date | null;
  acceptedAt: Date | null;
  acceptedByName: string | null;
  acceptedByEmail: string | null;
  expiresAt: Date | null;
};

// Direct mirror of ShareProposalPanel — same shape, same layout, for the
// quotation's own public accept/reject link.
export function ShareQuotationPanel({
  quotationId,
  share,
  baseUrl,
  canResend,
}: {
  quotationId: string;
  share: ShareInfo | null;
  baseUrl: string;
  canResend: boolean;
}) {
  if (!share) {
    return (
      <form action={createQuotationShareAction.bind(null, quotationId)}>
        <Button type="submit" variant="outline" size="sm">
          Generate secure share link
        </Button>
      </form>
    );
  }

  const url = `${baseUrl}/q/${share.token}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={documentStatusBadgeVariant(share.status)}>
          {documentStatusLabel(share.status)}
        </Badge>
        <code className="rounded bg-muted px-2 py-1 text-xs">{url}</code>
        <CopyLinkButton url={url} />
      </div>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span>
          {share.viewCount} view{share.viewCount === 1 ? "" : "s"}
          {share.firstViewedAt ? ` · first viewed ${formatDateTime(share.firstViewedAt)}` : ""}
        </span>
        {share.acceptedAt && (
          <span>
            Accepted by {share.acceptedByName} ({share.acceptedByEmail}) on{" "}
            {formatDateTime(share.acceptedAt)}
          </span>
        )}
        {share.expiresAt && <span>Link expires {formatDateTime(share.expiresAt)}</span>}
      </div>
      {canResend && <ResendQuotationShareButton quotationId={quotationId} />}
    </div>
  );
}
