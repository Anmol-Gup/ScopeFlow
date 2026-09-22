import { Mail } from "lucide-react";
import { ServiceLibrary } from "@/components/settings/service-library";
import { Card } from "@/components/ui/card";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const { workspaceId } = await requireWorkspaceAccess();
  const services = await db.service.findMany({ where: { workspaceId }, orderBy: { name: "asc" } });

  const serviceRows = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    defaultPrice: s.defaultPrice.toString(),
    unit: s.unit,
  }));

  return (
    <div className="flex flex-col gap-6">
      <ServiceLibrary services={serviceRows} />

      <Card className="bg-accent/40 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Questions?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Need help with your workspace or have a question about ScopeFlow?{" "}
              <a
                href="mailto:contact.agbusinesssolutions@gmail.com"
                className="font-medium text-primary hover:underline"
              >
                contact.agbusinesssolutions@gmail.com
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
