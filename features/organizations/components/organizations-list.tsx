"use client";

import { Building2, FolderKanban, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { CreateOrganizationDialog } from "@/features/organizations/components/create-organization-dialog";
import { resolveOrganizationPermissions } from "@/features/organizations/lib/org-permissions";
import { formatOrgRole, getOrgRoleBadgeClass } from "@/features/organizations/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { easeOut, fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { OrgRole } from "@prisma/client";

export interface OrganizationListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: OrgRole;
}

interface OrganizationsListProps {
  organizations: OrganizationListItem[];
}

function getOrgInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function OrganizationsList({ organizations }: OrganizationsListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-br from-card/50 to-primary/5 px-6 py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-inner-soft">
          <Building2 className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">No organizations yet</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Create your first organization to manage teams, members, and enterprise workspaces.
        </p>
        <Button className="mt-8" size="lg" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create organization
        </Button>
        <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={reduceMotion ? undefined : staggerContainer}
      initial={false}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-card/70 to-primary/5 p-6 md:p-8"
        variants={fadeUp}
        transition={easeOut}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Users className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{organizations.length}</p>
              <p className="text-sm text-muted-foreground">
                Organization{organizations.length === 1 ? "" : "s"} in your workspace
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New organization
          </Button>
        </div>
      </motion.div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
        {organizations.map((org) => {
          const permissions = resolveOrganizationPermissions(org.role);

          return (
          <motion.li key={org.id} className="h-full" variants={fadeUp} transition={easeOut}>
            <Card className="group relative flex h-full flex-col overflow-hidden border-border/60 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/60 hover:shadow-soft">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />

              <div className="relative flex flex-1 flex-col p-5">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-gradient-to-br from-secondary/60 to-secondary/20 text-xs font-semibold tracking-wide text-primary"
                    aria-hidden="true"
                  >
                    {getOrgInitials(org.name)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/dashboard/organizations/${org.id}/settings`}
                        className="truncate font-semibold leading-tight text-foreground transition-colors group-hover:text-primary"
                      >
                        {org.name}
                      </Link>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0 text-[10px]", getOrgRoleBadgeClass(org.role))}
                      >
                        {formatOrgRole(org.role)}
                      </Badge>
                    </div>
                    <p className="truncate font-mono text-xs text-muted-foreground">/{org.slug}</p>
                  </div>
                </div>

                <p
                  className={cn(
                    "mt-4 min-h-10 line-clamp-2 text-sm leading-relaxed",
                    org.description ? "text-muted-foreground" : "text-muted-foreground/40",
                  )}
                >
                  {org.description ?? "No description"}
                </p>

                <div className="mt-auto border-t border-border/40 pt-4 flex flex-col gap-2">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/dashboard/organizations/${org.id}/workspaces`}>
                      <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
                      Workspaces
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link href={`/dashboard/organizations/${org.id}/settings`}>
                      {permissions.canManageSettings ? "Manage organization" : "View organization"}
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.li>
          );
        })}
      </ul>

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </motion.div>
  );
}
