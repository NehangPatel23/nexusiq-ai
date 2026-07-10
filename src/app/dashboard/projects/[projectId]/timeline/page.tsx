import { ProjectTabPlaceholder } from "@/features/projects/components/project-tab-placeholder";
import { PROJECT_TAB_SLICES } from "@/features/projects/lib/project-tabs";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TimelinePage({ params }: PageProps) {
  const { projectId } = await params;
  const config = PROJECT_TAB_SLICES.timeline;
  return (
    <ProjectTabPlaceholder projectId={projectId} {...config} highlights={[...config.highlights]} />
  );
}
