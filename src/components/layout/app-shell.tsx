import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppShell({ children, breadcrumbs }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-sidebar">
        <Topbar breadcrumbs={breadcrumbs} />
        <main id="main-content" className="px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
