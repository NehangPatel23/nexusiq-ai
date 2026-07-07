"use client";

import { Bell, ChevronRight, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/layout/command-palette";

interface TopbarProps {
  breadcrumbs?: { label: string; href?: string }[];
}

export function Topbar({
  breadcrumbs = [{ label: "Dashboard" }],
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-topbar items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
            {crumb.href ? (
              <a href={crumb.href} className="text-muted-foreground hover:text-foreground">
                {crumb.label}
              </a>
            ) : (
              <span className="font-medium text-foreground" aria-current="page">
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 text-muted-foreground md:flex"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Search</span>
          <kbd className="pointer-events-none hidden rounded border border-border bg-muted px-1.5 font-mono text-xs lg:inline-block">
            ⌘K
          </kbd>
        </Button>

        <CommandPalette />

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-secondary text-xs">U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
