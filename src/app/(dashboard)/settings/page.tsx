import { ServiceLibrary } from "@/components/settings/service-library";
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
    </div>
  );
}
