"use client";

import {
  BarChart3,
  Bot,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderOpen },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/intelligence", label: "Intelligence", icon: Bot },
  { href: "/dashboard/history", label: "History", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-sidebar flex-col border-r border-border bg-card"
      aria-label="Main navigation"
    >
      <div className="flex h-topbar items-center border-b border-border px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Users className="h-4 w-4" aria-hidden="true" />
          </div>
          <span>NexusIQ</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Dashboard">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">
          Auth protection enabled in slice 01
        </p>
      </div>
    </aside>
  );
}
