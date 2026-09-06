import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceFormDialog } from "@/components/settings/service-form-dialog";
import { deleteServiceAction } from "@/server/actions/services";
import { formatCurrency } from "@/lib/format";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: string;
  unit: string | null;
};

export function ServiceLibrary({ services }: { services: ServiceRow[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between space-y-0">
        <CardTitle>Service &amp; pricing library</CardTitle>
        <ServiceFormDialog
          mode="create"
          trigger={{
            content: (
              <>
                <Plus />
                Add service
              </>
            ),
            size: "sm",
          }}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No services yet. Add reusable starting prices your team can drop into any quotation —
            every quotation can still override them.
          </p>
        ) : (
          services.map((service) => (
            <div key={service.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">
                  {service.name}
                  {service.unit && (
                    <span className="ml-1 text-xs text-muted-foreground">({service.unit})</span>
                  )}
                </p>
                {service.description && (
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatCurrency(service.defaultPrice)}</span>
                <ServiceFormDialog
                  mode="edit"
                  serviceId={service.id}
                  defaults={{
                    name: service.name,
                    description: service.description ?? "",
                    defaultPrice: service.defaultPrice,
                    unit: service.unit ?? "",
                  }}
                  trigger={{ content: <Pencil />, variant: "ghost", size: "icon-sm" }}
                />
                <form action={deleteServiceAction}>
                  <input type="hidden" name="serviceId" value={service.id} />
                  <Button type="submit" variant="ghost" size="icon-sm">
                    <Trash2 />
                  </Button>
                </form>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
