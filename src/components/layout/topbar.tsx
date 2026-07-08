"use client";

import { ChevronRight, LogOut, Search, Settings, User } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { signOutUser } from "@/features/auth/actions";
import { NotificationsBell } from "@/features/organizations/components/notifications-bell";
import type { AppShellUser } from "@/components/layout/app-shell";
import { CommandPalette } from "@/components/layout/command-palette";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/hooks/use-confirm";

interface TopbarProps {
  user?: AppShellUser;
  breadcrumbs?: { label: string; href?: string }[];
}

function getInitials(name: string | null | undefined, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "U";
}

export function Topbar({
  user,
  breadcrumbs = [{ label: "Dashboard" }],
}: TopbarProps) {
  const confirm = useConfirm();
  const [isSigningOut, startSignOut] = useTransition();

  async function handleSignOut(event: Event) {
    event.preventDefault();

    const confirmed = await confirm({
      title: "Sign out of NexusIQ?",
      description: "You will need to sign in again to access your workspace.",
      confirmLabel: "Sign out",
      variant: "destructive",
    });
    if (!confirmed) return;

    startSignOut(async () => {
      await signOutUser();
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-topbar items-center justify-between border-b border-border/50 bg-background/60 px-8 backdrop-blur-xl">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
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
          className="hidden h-9 gap-2 border-border/60 bg-card/40 text-muted-foreground md:flex"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="text-[13px]">Search</span>
          <kbd className="pointer-events-none hidden rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] lg:inline-block">
            ⌘K
          </kbd>
        </Button>

        <CommandPalette />

        <NotificationsBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8 ring-2 ring-border/50">
                {user?.image && <AvatarImage src={user.image} alt="" />}
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-medium">
                  {getInitials(user?.name, user?.email ?? "")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {user && (
              <>
                <DropdownMenuLabel className="px-3 py-2.5 font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{user.name ?? "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/profile">
                <User className="h-4 w-4" aria-hidden="true" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleSignOut}
              disabled={isSigningOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
