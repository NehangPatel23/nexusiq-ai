"use client";

import {
  BarChart3,
  Bot,
  Building2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/projects", label: "Projects", icon: FolderOpen },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard/intelligence", label: "Agents", icon: Bot },
      { href: "/dashboard/search", label: "Search", icon: Search },
      { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
    ],
  },
  {
    label: "Output",
    items: [
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
      { href: "/dashboard/history", label: "History", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/organizations", label: "Organizations", icon: Building2 },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/admin", label: "Admin", icon: Shield },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-sidebar flex-col border-r border-border/50 bg-card/50 backdrop-blur-xl"
      aria-label="Main navigation"
    >
      <div className="flex h-topbar items-center border-b border-border/50 px-5">
        <Link href="/dashboard" className="transition-opacity hover:opacity-90">
          <Logo size="sm" glow />
        </Link>
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto px-3 py-6" aria-label="Dashboard">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-foreground shadow-inner-soft"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border border-transparent transition-colors",
                          isActive
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "bg-secondary/40 text-muted-foreground group-hover:bg-secondary/70",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/50 p-4">
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Enterprise</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Multi-agent intelligence with local AI and full citation traceability.
          </p>
        </div>
      </div>
    </aside>
  );
}
