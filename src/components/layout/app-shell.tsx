import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export interface AppShellUser {
  name?: string | null;
  email: string;
  image?: string | null;
}

interface AppShellProps {
  children: React.ReactNode;
  user?: AppShellUser;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppShell({ children, user, breadcrumbs }: AppShellProps) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" aria-hidden="true" />
      <Sidebar />
      <div className="relative pl-sidebar">
        <Topbar user={user} breadcrumbs={breadcrumbs} />
        <main id="main-content" className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
