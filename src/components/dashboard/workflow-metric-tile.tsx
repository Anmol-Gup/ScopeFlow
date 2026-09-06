import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkflowMetricTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
