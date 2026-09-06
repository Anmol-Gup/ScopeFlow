import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OPERATION_LABELS: Record<string, string> = {
  GENERATE_PROPOSAL: "Generate Proposal",
  GENERATE_FOLLOWUP: "Generate Follow-up",
  SUGGEST_NEGOTIATION: "Suggest Negotiation",
  REVISE_PROPOSAL: "Revise Proposal (AI)",
};

function formatUsd(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `$${amount.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") || "0"}`;
}

export function AIUsageSummary({
  totalOperations,
  totalInputTokens,
  totalOutputTokens,
  totalEstimatedCost,
  byOperation,
}: {
  totalOperations: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: number;
  byOperation: { operation: string; count: number; inputTokens: number; outputTokens: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI usage</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          LLM usage is billed directly by your selected AI provider to you — these are rough,
          estimated figures for your own visibility only, not an invoice.
        </p>
        {totalOperations === 0 ? (
          <p className="text-sm text-muted-foreground">
            No AI operations yet. Usage appears here after you generate a proposal or ask for
            negotiation help.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Operations</p>
                <p className="text-xl font-semibold">{totalOperations}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Input tokens</p>
                <p className="text-xl font-semibold">{totalInputTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Output tokens</p>
                <p className="text-xl font-semibold">{totalOutputTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated cost</p>
                <p className="text-xl font-semibold">{formatUsd(totalEstimatedCost)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {byOperation.map((row) => (
                <div key={row.operation} className="flex justify-between text-sm">
                  <span>{OPERATION_LABELS[row.operation] ?? row.operation}</span>
                  <span className="text-muted-foreground">
                    {row.count} call{row.count === 1 ? "" : "s"} · {row.inputTokens.toLocaleString()} in
                    · {row.outputTokens.toLocaleString()} out
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
