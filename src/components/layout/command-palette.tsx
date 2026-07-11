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
import { usePathname, useRouter } from "next/navigation";
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
import { dispatchDataRoomUpload } from "@/features/data-room/lib/data-room-events";

const navigationCommands = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderOpen },
  { label: "Intelligence", href: "/dashboard/intelligence", icon: Bot },
  { label: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "History", href: "/dashboard/history", icon: BarChart3 },
];

const actionCommands = [
  { label: "Upload to data room", icon: Upload, shortcut: "U", action: "upload-data-room" as const },
  { label: "Run full scan", href: "/dashboard/intelligence", icon: Bot, action: "navigate" as const },
  { label: "New chat", href: "/dashboard/chat", icon: MessageSquare, action: "navigate" as const },
  { label: "Search documents", href: "/dashboard/search", icon: Search, action: "navigate" as const },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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

  function handleUploadToDataRoom() {
    setOpen(false);
    const projectMatch = pathname.match(/\/dashboard\/projects\/([^/]+)/);
    if (pathname.includes("/data-room") && projectMatch) {
      dispatchDataRoomUpload();
      return;
    }
    if (projectMatch) {
      router.push(`/dashboard/projects/${projectMatch[1]}/data-room`);
      window.setTimeout(() => dispatchDataRoomUpload(), 300);
      return;
    }
    router.push("/dashboard/projects");
  }

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
                onSelect={() => {
                  if (command.action === "upload-data-room") {
                    handleUploadToDataRoom();
                  } else if ("href" in command && command.href) {
                    navigate(command.href);
                  }
                }}
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
