"use client";

import { Copy, MoreHorizontal, Pin, PinOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  duplicateProjectAction,
  toggleProjectPinAction,
} from "@/features/projects/actions";
import { useProjectShellOptional } from "@/features/projects/components/project-shell-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectCardMenuProps {
  projectId: string;
  projectName: string;
  pinned: boolean;
  canEdit: boolean;
}

export function ProjectCardMenu({
  projectId,
  projectName,
  pinned,
  canEdit,
}: ProjectCardMenuProps) {
  const router = useRouter();
  const shell = useProjectShellOptional();
  const [isPending, startTransition] = useTransition();

  function handlePin() {
    startTransition(async () => {
      const result = await toggleProjectPinAction(projectId);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      const nextPinned = result.data?.pinned ?? !pinned;
      toast.success(nextPinned ? "Project pinned" : "Project unpinned");
      if (shell) {
        shell.setProject({ pinned: nextPinned });
      } else {
        router.refresh();
      }
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateProjectAction(projectId);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Project duplicated");
      if (!shell) {
        router.refresh();
      }
      if (result.data?.id) {
        router.push(`/dashboard/projects/${result.data.id}`);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label={`Actions for ${projectName}`}
          disabled={isPending}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {canEdit && (
          <DropdownMenuItem onClick={handlePin}>
            {pinned ? (
              <>
                <PinOff className="h-4 w-4" aria-hidden="true" />
                Unpin
              </>
            ) : (
              <>
                <Pin className="h-4 w-4" aria-hidden="true" />
                Pin project
              </>
            )}
          </DropdownMenuItem>
        )}
        {canEdit && (
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Duplicate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
