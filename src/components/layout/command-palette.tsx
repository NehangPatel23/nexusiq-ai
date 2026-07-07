"use client";

import {
  BarChart3,
  Bot,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Search,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

const navigationCommands = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderOpen },
  { label: "Intelligence", href: "/dashboard/intelligence", icon: Bot },
  { label: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "History", href: "/dashboard/history", icon: BarChart3 },
];

const actionCommands = [
  { label: "Upload documents", href: "/dashboard/projects", icon: Upload, shortcut: "⌘U" },
  { label: "Run full scan", href: "/dashboard/intelligence", icon: Bot },
  { label: "New chat", href: "/dashboard/chat", icon: MessageSquare },
  { label: "Search documents", href: "/dashboard/search", icon: Search },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search commands, pages, actions…" aria-label="Command search" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {navigationCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.href}
                value={command.label}
                onSelect={() => navigate(command.href)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{command.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Actions">
          {actionCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.label}
                value={command.label}
                onSelect={() => navigate(command.href)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{command.label}</span>
                {command.shortcut && <CommandShortcut>{command.shortcut}</CommandShortcut>}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
