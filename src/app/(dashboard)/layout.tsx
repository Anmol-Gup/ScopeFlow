import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { requireWorkspaceAccess, UnauthorizedError } from "@/lib/workspace";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let membership;
  try {
    membership = await requireWorkspaceAccess();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }

  return (
    <SidebarProvider>
      <AppSidebar workspaceName={membership.workspace.name} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">{membership.workspace.name}</span>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
