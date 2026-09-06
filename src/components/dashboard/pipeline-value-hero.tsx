import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export function PipelineValueHero({ value }: { value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Pipeline Value
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold tracking-tight">{formatCurrency(value)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Total budget across projects still in scoping, not yet won.
        </p>
      </CardContent>
    </Card>
  );
}
