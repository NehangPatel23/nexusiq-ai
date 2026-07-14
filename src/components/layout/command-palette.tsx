"use client";

import {
  AlertTriangle,
  BarChart3,
  Bot,
  ClipboardList,
  FileQuestion,
  FileText,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Network,
  Search,
  ShieldAlert,
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

const actionCommands = (
  projectSearchHref: string,
  projectChatHref: string,
  projectIntelligenceHref: string,
  projectReportsHref: string,
  projectTimelineHref: string,
  projectGraphHref: string,
  projectContradictionsHref: string,
  projectMissingHref: string,
  projectRisksHref: string,
  projectSimulatorHref: string,
  projectActionsHref: string,
) => [
  { label: "Upload to data room", icon: Upload, shortcut: "U", action: "upload-data-room" as const },
  { label: "Run full scan", href: projectIntelligenceHref, icon: Bot, action: "navigate" as const },
  { label: "New chat", href: projectChatHref, icon: MessageSquare, action: "navigate" as const },
  { label: "Search documents", href: projectSearchHref, icon: Search, action: "navigate" as const },
  {
    label: "Generate executive report",
    href: projectReportsHref,
    icon: FileText,
    action: "navigate" as const,
  },
  {
    label: "Extract timeline events",
    href: projectTimelineHref,
    icon: BarChart3,
    action: "navigate" as const,
  },
  {
    label: "Open relationship graph",
    href: projectGraphHref,
    icon: Network,
    action: "navigate" as const,
  },
  {
    label: "Scan contradictions",
    href: projectContradictionsHref,
    icon: AlertTriangle,
    action: "navigate" as const,
  },
  {
    label: "Missing documents",
    href: projectMissingHref,
    icon: FileQuestion,
    action: "navigate" as const,
  },
  {
    label: "Open risks overview",
    href: projectRisksHref,
    icon: ShieldAlert,
    action: "navigate" as const,
  },
  {
    label: "Run risk simulation",
    href: projectSimulatorHref,
    icon: FlaskConical,
    action: "navigate" as const,
  },
  {
    label: "Open action plan",
    href: projectActionsHref,
    icon: ClipboardList,
    action: "navigate" as const,
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
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

  useEffect(() => {
    if (!open) {
      setPaletteQuery("");
    }
  }, [open]);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const projectMatch = pathname.match(/\/dashboard\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1];
  const projectSearchHref = projectId
    ? `/dashboard/projects/${projectId}/search`
    : "/dashboard/search";
  const projectChatHref = projectId
    ? `/dashboard/projects/${projectId}/chat?new=1`
    : "/dashboard/chat";
  const projectIntelligenceHref = projectId
    ? `/dashboard/projects/${projectId}/intelligence?fullAnalysis=1`
    : "/dashboard/intelligence";
  const projectReportsHref = projectId
    ? `/dashboard/projects/${projectId}/reports?generate=EXECUTIVE`
    : "/dashboard/reports";
  const projectTimelineHref = projectId
    ? `/dashboard/projects/${projectId}/timeline?extract=1`
    : "/dashboard/projects";
  const projectGraphHref = projectId
    ? `/dashboard/projects/${projectId}/graph`
    : "/dashboard/projects";
  const projectContradictionsHref = projectId
    ? `/dashboard/projects/${projectId}/contradictions?scan=1`
    : "/dashboard/projects";
  const projectMissingHref = projectId
    ? `/dashboard/projects/${projectId}/missing?scan=1`
    : "/dashboard/projects";
  const projectRisksHref = projectId
    ? `/dashboard/projects/${projectId}/risks`
    : "/dashboard/projects";
  const projectSimulatorHref = projectId
    ? `/dashboard/projects/${projectId}/simulator`
    : "/dashboard/projects";
  const projectActionsHref = projectId
    ? `/dashboard/projects/${projectId}/actions`
    : "/dashboard/projects";

  const trimmedQuery = paletteQuery.trim();
  const showQuerySearch = trimmedQuery.length >= 2 && Boolean(projectId);

  function handleUploadToDataRoom() {
    setOpen(false);
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

  function handleSearchWithQuery() {
    if (!projectId || !trimmedQuery) return;
    const params = new URLSearchParams({ q: trimmedQuery });
    navigate(`/dashboard/projects/${projectId}/search?${params.toString()}`);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search commands, pages, or documents…"
        aria-label="Command search"
        value={paletteQuery}
        onValueChange={setPaletteQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {showQuerySearch && (
          <CommandGroup heading="Search documents">
            <CommandItem value={`search-query-${trimmedQuery}`} onSelect={handleSearchWithQuery}>
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>
                Search &ldquo;{trimmedQuery}&rdquo; in this project
              </span>
            </CommandItem>
          </CommandGroup>
        )}

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
          {actionCommands(
            projectSearchHref,
            projectChatHref,
            projectIntelligenceHref,
            projectReportsHref,
            projectTimelineHref,
            projectGraphHref,
            projectContradictionsHref,
            projectMissingHref,
            projectRisksHref,
            projectSimulatorHref,
            projectActionsHref,
          ).map((command) => {
            const Icon = command.icon;
            const href =
              command.label === "Search documents" && trimmedQuery && projectId
                ? `${projectSearchHref}?q=${encodeURIComponent(trimmedQuery)}`
                : command.href;

            return (
              <CommandItem
                key={command.label}
                value={command.label}
                onSelect={() => {
                  if (command.action === "upload-data-room") {
                    handleUploadToDataRoom();
                  } else if (href) {
                    navigate(href);
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
