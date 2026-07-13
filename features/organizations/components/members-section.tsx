"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  cancelInviteAction,
  inviteMemberAction,
  removeMemberAction,
  updateInviteRoleAction,
  updateMemberRoleAction,
} from "@/features/organizations/actions";
import { INVITABLE_ROLES, formatOrgRole } from "@/features/organizations/lib/roles";
import { AppSelect } from "@/components/ui/app-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/hooks/use-confirm";
import type { OrgRole } from "@prisma/client";

interface MemberUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface Member {
  id: string;
  role: OrgRole;
  user: MemberUser;
}

interface PendingInvite {
  id: string;
  email: string;
  role: OrgRole;
  expiresAt: Date | string;
}

interface MembersSectionProps {
  orgId: string;
  members: Member[];
  pendingInvites: PendingInvite[];
  canManage: boolean;
  currentUserId: string;
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function MembersSection({
  orgId,
  members,
  pendingInvites,
  canManage,
  currentUserId,
}: MembersSectionProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [inviteRole, setInviteRole] = useState<OrgRole>("VIEWER");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isInviting, startInvite] = useTransition();
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [memberRoleOverrides, setMemberRoleOverrides] = useState<Record<string, OrgRole>>({});
  const [inviteRoleOverrides, setInviteRoleOverrides] = useState<Record<string, OrgRole>>({});

  const memberRolesKey = members.map((member) => `${member.id}:${member.role}`).join("|");
  const inviteRolesKey = pendingInvites.map((invite) => `${invite.id}:${invite.role}`).join("|");

  useEffect(() => {
    setMemberRoleOverrides({});
    setInviteRoleOverrides({});
  }, [memberRolesKey, inviteRolesKey]);

  function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;

    setInviteError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const input = {
      email: formData.get("email"),
      role: inviteRole,
    };

    startInvite(async () => {
      const result = await inviteMemberAction(orgId, input);
      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        } else {
          setInviteError(result.error.message);
        }
        return;
      }

      toast.success("Invitation sent");
      if (result.data?.devInviteUrl) {
        toast.message("Development mode", {
          description: `Invite link: ${result.data.devInviteUrl}`,
        });
      }
      (event.target as HTMLFormElement).reset();
      setInviteRole("VIEWER");
      router.refresh();
    });
  }

  async function handleRoleChange(memberId: string, previousRole: OrgRole, newRole: OrgRole) {
    if (!canManage || newRole === previousRole) return;

    const confirmed = await confirm({
      title: "Change member role?",
      description: `Update this member's role to ${formatOrgRole(newRole)}?`,
      confirmLabel: "Update role",
    });
    if (!confirmed) {
      setMemberRoleOverrides((prev) => ({ ...prev, [memberId]: previousRole }));
      return;
    }

    setPendingMemberId(memberId);
    updateMemberRoleAction(orgId, memberId, { role: newRole }).then((result) => {
      setPendingMemberId(null);
      if (!result.success) {
        setMemberRoleOverrides((prev) => ({ ...prev, [memberId]: previousRole }));
        toast.error(result.error.message);
        return;
      }
      toast.success("Role updated");
      router.refresh();
    });
  }

  async function handleRemove(memberId: string, name: string) {
    if (!canManage) return;

    const confirmed = await confirm({
      title: `Remove ${name}?`,
      description: "This member will lose access to the organization.",
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!confirmed) return;

    setPendingMemberId(memberId);
    removeMemberAction(orgId, memberId).then((result) => {
      setPendingMemberId(null);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Member removed");
      router.refresh();
    });
  }

  async function handleInviteRoleChange(
    inviteId: string,
    previousRole: OrgRole,
    newRole: OrgRole,
  ) {
    if (!canManage || newRole === previousRole) return;

    const confirmed = await confirm({
      title: "Change invite role?",
      description: `Update this invitation's role to ${formatOrgRole(newRole)}?`,
      confirmLabel: "Update role",
    });
    if (!confirmed) {
      setInviteRoleOverrides((prev) => ({ ...prev, [inviteId]: previousRole }));
      return;
    }

    setPendingInviteId(inviteId);
    updateInviteRoleAction(orgId, inviteId, { role: newRole }).then((result) => {
      setPendingInviteId(null);
      if (!result.success) {
        setInviteRoleOverrides((prev) => ({ ...prev, [inviteId]: previousRole }));
        toast.error(result.error.message);
        return;
      }
      toast.success("Invite role updated");
      router.refresh();
    });
  }

  async function handleCancelInvite(inviteId: string, email: string) {
    if (!canManage) return;

    const confirmed = await confirm({
      title: "Cancel invitation?",
      description: `Cancel the pending invitation for ${email}?`,
      confirmLabel: "Cancel invite",
      variant: "destructive",
    });
    if (!confirmed) return;

    setPendingInviteId(inviteId);
    cancelInviteAction(orgId, inviteId).then((result) => {
      setPendingInviteId(null);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Invitation cancelled");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <form onSubmit={handleInvite} className="rounded-xl border border-border/60 bg-card/30 p-4">
          <h3 className="mb-4 text-sm font-semibold">Invite member</h3>
          {inviteError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {inviteError}
            </div>
          )}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                placeholder="colleague@company.com"
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>
              )}
            </div>
            <div className="space-y-2 sm:w-40">
              <Label htmlFor="invite-role">Role</Label>
              <AppSelect
                id="invite-role"
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as OrgRole)}
                triggerClassName="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                options={INVITABLE_ROLES.map((role) => ({
                  value: role,
                  label: formatOrgRole(role),
                }))}
              />
            </div>
            <Button type="submit" disabled={isInviting}>
              {isInviting ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Organization members</caption>
          <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Member
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Role
              </th>
              {canManage && (
                <th scope="col" className="px-4 py-3 font-medium">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isOwner = member.role === "OWNER";
              const isSelf = member.user.id === currentUserId;
              const displayName = member.user.name ?? member.user.email;

              return (
                <tr key={member.id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {member.user.image && <AvatarImage src={member.user.image} alt="" />}
                        <AvatarFallback className="text-xs">
                          {getInitials(member.user.name, member.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {canManage && !isOwner && !isSelf ? (
                      <AppSelect
                        value={memberRoleOverrides[member.id] ?? member.role}
                        disabled={pendingMemberId === member.id}
                        onValueChange={(value) => {
                          const previousRole = memberRoleOverrides[member.id] ?? member.role;
                          const newRole = value as OrgRole;
                          setMemberRoleOverrides((prev) => ({ ...prev, [member.id]: newRole }));
                          void handleRoleChange(member.id, previousRole, newRole);
                        }}
                        aria-label={`Role for ${displayName}`}
                        triggerClassName="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        options={INVITABLE_ROLES.map((role) => ({
                          value: role,
                          label: formatOrgRole(role),
                        }))}
                      />
                    ) : (
                      <Badge variant="outline">{formatOrgRole(member.role)}</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      {!isOwner && !isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${displayName}`}
                          disabled={pendingMemberId === member.id}
                          onClick={() => handleRemove(member.id, displayName)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pendingInvites.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Pending invitations</h3>
          <ul className="space-y-2" role="list">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{invite.email}</span>
                <div className="flex items-center gap-2">
                  {canManage ? (
                    <AppSelect
                      value={inviteRoleOverrides[invite.id] ?? invite.role}
                      disabled={pendingInviteId === invite.id}
                      onValueChange={(value) => {
                        const previousRole = inviteRoleOverrides[invite.id] ?? invite.role;
                        const newRole = value as OrgRole;
                        setInviteRoleOverrides((prev) => ({ ...prev, [invite.id]: newRole }));
                        void handleInviteRoleChange(invite.id, previousRole, newRole);
                      }}
                      aria-label={`Role for invite ${invite.email}`}
                      triggerClassName="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      options={INVITABLE_ROLES.map((role) => ({
                        value: role,
                        label: formatOrgRole(role),
                      }))}
                    />
                  ) : (
                    <Badge variant="outline">{formatOrgRole(invite.role)}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">Pending</span>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Cancel invite for ${invite.email}`}
                      disabled={pendingInviteId === invite.id}
                      onClick={() => handleCancelInvite(invite.id, invite.email)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
