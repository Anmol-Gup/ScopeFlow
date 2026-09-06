import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PROJECT_PIPELINE_STAGES,
  projectPipelineStageBadgeVariant,
  type ProjectPipelineStage,
} from "@/lib/projects/pipeline";

const VARIANT_BAR_CLASS: Record<string, string> = {
  default: "bg-primary",
  secondary: "bg-secondary-foreground/30",
  destructive: "bg-destructive",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  outline: "bg-muted-foreground/30",
};

export function PipelineStageBar({ counts }: { counts: Record<ProjectPipelineStage, number> }) {
  const total = PROJECT_PIPELINE_STAGES.reduce((sum, s) => sum + (counts[s.value] ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline overview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {total === 0
            ? null
            : PROJECT_PIPELINE_STAGES.map((s) => {
                const count = counts[s.value] ?? 0;
                if (count === 0) return null;
                return (
                  <div
                    key={s.value}
                    className={VARIANT_BAR_CLASS[projectPipelineStageBadgeVariant(s.value)]}
                    style={{ width: `${(count / total) * 100}%` }}
                    title={`${s.label}: ${count}`}
                  />
                );
              })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {PROJECT_PIPELINE_STAGES.map((s) => (
            <span key={s.value} className="flex items-center gap-1.5">
              <span
                className={`size-2 rounded-full ${VARIANT_BAR_CLASS[projectPipelineStageBadgeVariant(s.value)]}`}
              />
              {s.label} ({counts[s.value] ?? 0})
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
