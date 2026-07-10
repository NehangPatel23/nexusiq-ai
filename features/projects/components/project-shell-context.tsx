"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ProjectSnapshot } from "@/features/projects/lib/project-snapshot";

interface ProjectShellContextValue {
  project: ProjectSnapshot;
  canEdit: boolean;
  canDelete: boolean;
  setProject: (patch: Partial<ProjectSnapshot> | ProjectSnapshot) => void;
}

const ProjectShellContext = createContext<ProjectShellContextValue | null>(null);

interface ProjectShellProviderProps {
  initialProject: ProjectSnapshot;
  canEdit: boolean;
  canDelete: boolean;
  children: ReactNode;
}

export function ProjectShellProvider({
  initialProject,
  canEdit,
  canDelete,
  children,
}: ProjectShellProviderProps) {
  const [project, setProjectState] = useState(initialProject);

  useEffect(() => {
    setProjectState(initialProject);
  }, [initialProject]);

  const setProject = useCallback((patch: Partial<ProjectSnapshot> | ProjectSnapshot) => {
    setProjectState((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ project, canEdit, canDelete, setProject }),
    [project, canEdit, canDelete, setProject],
  );

  return <ProjectShellContext.Provider value={value}>{children}</ProjectShellContext.Provider>;
}

export function useProjectShell() {
  const context = useContext(ProjectShellContext);
  if (!context) {
    throw new Error("useProjectShell must be used within ProjectShellProvider");
  }
  return context;
}

export function useProjectShellOptional() {
  return useContext(ProjectShellContext);
}
