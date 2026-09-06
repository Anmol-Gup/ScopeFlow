"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  FileText,
  Receipt,
  FolderKanban,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { logoutAction } from "@/server/actions/auth";
import { Logo } from "@/components/brand/logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/requirements", label: "Requirements", icon: ListChecks },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/quotations", label: "Quotations", icon: Receipt },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-1 px-3 py-3">
        <Logo />
        <span className="truncate text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          {workspaceName}
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logoutAction}>
              <SidebarMenuButton type="submit" tooltip="Log out">
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
