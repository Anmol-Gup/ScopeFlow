"use client";

import { useRef } from "react";
import { resendProposalShareAction } from "@/server/actions/proposal-share";
import { Button } from "@/components/ui/button";

export function ResendProposalShareButton({ proposalId }: { proposalId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={resendProposalShareAction.bind(null, proposalId)}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          "This discards the client's recorded decision and re-opens this proposal for a new one. Continue?"
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
