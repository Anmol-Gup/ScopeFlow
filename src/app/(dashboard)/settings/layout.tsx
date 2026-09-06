import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your workspace, pricing, branding, and AI providers."
      />
      <SettingsNav />
      {children}
    </div>
  );
}
