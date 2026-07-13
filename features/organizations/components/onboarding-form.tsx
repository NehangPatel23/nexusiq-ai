"use client";

import { Check, FolderKanban, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ProjectType } from "@prisma/client";

import { createOrganizationAction } from "@/features/organizations/actions";
import { createProjectAction } from "@/features/projects/actions";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS } from "@/features/projects/lib/project-types";
import { createWorkspaceAction } from "@/features/workspaces/actions";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type OnboardingStep = 1 | 2 | 3;

const STEPS = [
  { id: 1 as const, label: "Organization", icon: FolderOpen },
  { id: 2 as const, label: "Workspace", icon: FolderKanban },
  { id: 3 as const, label: "Project", icon: FolderOpen },
];

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [orgId, setOrgId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("MA");
  const [isPending, startTransition] = useTransition();

  function goToDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  function handleCreateOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createOrganizationAction({
        name: orgName,
        description: orgDescription.trim() ? orgDescription.trim() : undefined,
      });

      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        } else {
          setError(result.error.message);
        }
        return;
      }

      toast.success("Organization created");
      setOrgId(result.data?.id ?? null);
      setStep(2);
    });
  }

  function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) {
      return;
    }

    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createWorkspaceAction(orgId, {
        name: workspaceName,
        description: workspaceDescription.trim() ? workspaceDescription.trim() : undefined,
      });

      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        } else {
          setError(result.error.message);
        }
        return;
      }

      toast.success("Workspace created");
      setWorkspaceId(result.data?.id ?? null);
      setStep(3);
    });
  }

  function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) {
      return;
    }

    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createProjectAction(workspaceId, {
        name: projectName,
        type: projectType,
      });

      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        } else {
          setError(result.error.message);
        }
        return;
      }

      toast.success("Project created");
      if (result.data?.id) {
        router.push(`/dashboard/projects/${result.data.id}`);
        router.refresh();
        return;
      }

      goToDashboard();
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-h1 text-gradient">Welcome to NexusIQ</h1>
        <p className="text-body-lg text-muted-foreground">
          {step === 1 && "Create your organization to get started. You can skip and do this later."}
          {step === 2 && "Add a workspace to organize projects and diligence workflows."}
          {step === 3 && "Optionally create your first project, or skip to the dashboard."}
        </p>
      </div>

      <ol className="flex items-center justify-center gap-2" aria-label="Onboarding progress">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          const isComplete = step > item.id;
          const isCurrent = step === item.id;

          return (
            <li key={item.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  isComplete && "border-primary/40 bg-primary/15 text-primary",
                  isCurrent && "border-primary bg-primary/10 text-primary",
                  !isComplete && !isCurrent && "border-border/60 text-muted-foreground",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Icon className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <span
                className={cn(
                  "hidden text-sm sm:inline",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
              {index < STEPS.length - 1 && (
                <div className="mx-1 hidden h-px w-8 bg-border/60 sm:block" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <form
          onSubmit={handleCreateOrganization}
          className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-6"
          noValidate
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
            <Label htmlFor="onboarding-org-name">Organization name</Label>
            <Input
              id="onboarding-org-name"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              required
              placeholder="Your company or team name"
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-org-description">Description (optional)</Label>
            <textarea
              id="onboarding-org-description"
              value={orgDescription}
              onChange={(event) => setOrgDescription(event.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={goToDashboard}>
              Skip for now
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Continue"}
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={handleCreateWorkspace}
          className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-6"
          noValidate
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
            <Label htmlFor="onboarding-workspace-name">Workspace name</Label>
            <Input
              id="onboarding-workspace-name"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              required
              placeholder="e.g. Due Diligence Team"
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-workspace-description">Description (optional)</Label>
            <textarea
              id="onboarding-workspace-description"
              value={workspaceDescription}
              onChange={(event) => setWorkspaceDescription(event.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={goToDashboard} disabled={isPending}>
              Skip for now
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Continue"}
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form
          onSubmit={handleCreateProject}
          className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-6"
          noValidate
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
            <Label htmlFor="onboarding-project-name">Project name (optional)</Label>
            <Input
              id="onboarding-project-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="e.g. Acme Corp Acquisition"
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-project-type">Project type</Label>
            <AppSelect
              id="onboarding-project-type"
              value={projectType}
              onValueChange={(value) => setProjectType(value as ProjectType)}
              triggerClassName="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              options={PROJECT_TYPES.map((type) => ({
                value: type,
                label: PROJECT_TYPE_LABELS[type],
              }))}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={goToDashboard} disabled={isPending}>
              Skip for now
            </Button>
            <Button type="submit" disabled={isPending || !projectName.trim()}>
              {isPending ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
