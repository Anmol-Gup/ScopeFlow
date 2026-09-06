"use client";

import { resendQuotationShareAction } from "@/server/actions/quotation-share";
import { Button } from "@/components/ui/button";

export function ResendQuotationShareButton({ quotationId }: { quotationId: string }) {
  return (
    <form
      action={resendQuotationShareAction.bind(null, quotationId)}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          "This discards the client's recorded decision and re-opens this quotation for a new one. Continue?"
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <Button type="submit" variant="outline" size="sm">
        Resend for a new decision
      </Button>
    </form>
  );
}
