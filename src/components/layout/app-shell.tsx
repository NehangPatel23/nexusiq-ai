"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { Topbar } from "@/components/layout/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface AppShellUser {
  name?: string | null;
  email: string;
  image?: string | null;
}

interface AppShellProps {
  children: React.ReactNode;
  user?: AppShellUser;
  breadcrumbs?: { label: string; href?: string }[];
  showAdmin?: boolean;
}

function AppShellInner({ children, user, breadcrumbs, showAdmin = false }: AppShellProps) {
  const { collapsed } = useSidebar();

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" aria-hidden="true" />
      <Sidebar showAdmin={showAdmin} />
      <div
        className={cn(
          "relative transition-[padding] duration-300 ease-out print:pl-0",
          collapsed ? "pl-[4.25rem]" : "pl-sidebar",
        )}
      >
        <div className="print:hidden">
          <Topbar user={user} breadcrumbs={breadcrumbs} showAdmin={showAdmin} />
        </div>
        <main id="main-content" className="page-content print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider>
      <TooltipProvider delayDuration={300} skipDelayDuration={100}>
        <AppShellInner {...props} />
      </TooltipProvider>
    </SidebarProvider>
  );
}
