"use client";

import { Building2, Check, FolderKanban, Info } from "lucide-react";
import { useState } from "react";

import type { OrgRoleDescription } from "@/features/organizations/lib/role-descriptions";
import { ORG_ROLE_DESCRIPTIONS } from "@/features/organizations/lib/role-descriptions";
import { formatOrgRole, getOrgRoleBadgeClass } from "@/features/organizations/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { OrgRole } from "@prisma/client";

interface OrgRolesInfoButtonProps {
  className?: string;
}

function PermissionList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5" role="list">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
          <Check
            className="mt-0.5 h-4 w-4 shrink-0 text-primary/80"
            aria-hidden="true"
            strokeWidth={2.5}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function RoleDetailPanel({ entry }: { entry: OrgRoleDescription }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 via-card/50 to-primary/5 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={cn("px-2.5 py-0.5 text-xs", getOrgRoleBadgeClass(entry.role))}>
            {formatOrgRole(entry.role)}
          </Badge>
          <h3 className="text-lg font-semibold tracking-tight">{entry.title}</h3>
        </div>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {entry.audience}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-xl border border-border/50 bg-muted/20 p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/60">
              <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Organization</h4>
          </div>
          <PermissionList items={entry.organizationAccess} />
        </section>

        <section className="rounded-xl border border-border/50 bg-muted/20 p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/60">
              <FolderKanban className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Workspaces</h4>
          </div>
          <PermissionList items={entry.workspaceAccess} />
        </section>
      </div>
    </div>
  );
}

export function OrgRolesInfoButton({ className }: OrgRolesInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<OrgRole>("OWNER");

  const selectedEntry =
    ORG_ROLE_DESCRIPTIONS.find((entry) => entry.role === selectedRole) ?? ORG_ROLE_DESCRIPTIONS[0];

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", className)}
        aria-label="Organization role permissions"
        onClick={() => setOpen(true)}
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[min(88vh,820px)] max-w-3xl flex-col gap-0 overflow-hidden p-0"
          aria-describedby="org-roles-info-description"
        >
          <DialogHeader className="shrink-0 space-y-2 border-b border-border/50 px-6 pb-5 pt-6 pr-14">
            <DialogTitle>Organization roles & access</DialogTitle>
            <DialogDescription id="org-roles-info-description" className="text-sm leading-relaxed">
              Pick a role to see who it&apos;s for and what they can do. Higher roles include
              lower-role permissions unless noted.
            </DialogDescription>
          </DialogHeader>

          <div
            className="scrollbar-premium shrink-0 overflow-x-auto border-b border-border/40 px-6 py-4"
            role="tablist"
            aria-label="Organization roles"
          >
            <div className="flex min-w-min gap-2">
              {ORG_ROLE_DESCRIPTIONS.map((entry) => {
                const isSelected = entry.role === selectedRole;
                return (
                  <button
                    key={entry.role}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={`role-panel-${entry.role}`}
                    id={`role-tab-${entry.role}`}
                    onClick={() => setSelectedRole(entry.role)}
                    className={cn(
                      "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all",
                      isSelected
                        ? "border-primary/45 bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/20"
                        : "border-border/60 bg-card/30 text-muted-foreground hover:border-border hover:bg-card/60 hover:text-foreground",
                    )}
                  >
                    {formatOrgRole(entry.role)}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="scrollbar-premium min-h-0 flex-1 overflow-y-auto px-6 py-6"
            role="tabpanel"
            id={`role-panel-${selectedEntry.role}`}
            aria-labelledby={`role-tab-${selectedEntry.role}`}
          >
            <RoleDetailPanel entry={selectedEntry} />
          </div>

          <div className="shrink-0 border-t border-border/50 bg-muted/15 px-6 py-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Need to change someone&apos;s access? Use the role dropdown on each member row in the
              table below.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
