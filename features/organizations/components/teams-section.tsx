"use client";

import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createTeamAction } from "@/features/organizations/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Team {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
}

interface TeamsSectionProps {
  orgId: string;
  teams: Team[];
  canManage: boolean;
}

export function TeamsSection({ orgId, teams, canManage }: TeamsSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;

    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const input = {
      name: formData.get("name"),
      description: formData.get("description") || undefined,
    };

    startTransition(async () => {
      const result = await createTeamAction(orgId, input);
      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        } else {
          setError(result.error.message);
        }
        return;
      }

      toast.success("Team created");
      setShowForm(false);
      router.refresh();
    });
  }

  if (teams.length === 0 && !canManage) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 px-6 py-10 text-center text-sm text-muted-foreground">
        No teams yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Cancel" : "Add team"}
          </Button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border/60 bg-card/30 p-4 space-y-4"
        >
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              name="name"
              required
              placeholder="Due diligence"
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-description">Description (optional)</Label>
            <Input
              id="team-description"
              name="description"
              placeholder="Optional description"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create team"}
          </Button>
        </form>
      )}

      {teams.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-6 py-10 text-center">
          <Users className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No teams yet. Create one to group members.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" role="list">
          {teams.map((team) => (
            <li
              key={team.id}
              className="rounded-xl border border-border/60 bg-card/30 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{team.name}</p>
                  {team.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>
                  )}
                </div>
                <Badge variant="outline">
                  {team._count.members} member{team._count.members === 1 ? "" : "s"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
