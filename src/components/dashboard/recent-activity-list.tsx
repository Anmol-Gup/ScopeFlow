import Link from "next/link";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";

type ActivityItem = {
  id: string;
  description: string;
  createdAt: Date | string;
  project: { id: string; name: string } | null;
};

export function RecentActivityList({ activities }: { activities: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <History className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No activity yet.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Requirement, proposal, quotation, and project updates will show up here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
                <span>
                  {activity.project && (
                    <>
                      <Link
                        href={`/projects/${activity.project.id}`}
                        className="font-medium underline underline-offset-4"
                      >
                        {activity.project.name}
                      </Link>{" "}
                    </>
                  )}
                  <span className="text-muted-foreground">{activity.description}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(activity.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
