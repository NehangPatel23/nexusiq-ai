import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { SettingsNav } from "@/features/settings/components/settings-nav";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Profile, security, notifications, and AI configuration."
      />
      <SettingsNav />
      {children}
    </div>
  );
}
