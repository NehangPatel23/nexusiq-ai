import { ProjectTabPlaceholder } from "@/features/projects/components/project-tab-placeholder";
import { PROJECT_TAB_SLICES } from "@/features/projects/lib/project-tabs";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function DataRoomPage({ params }: PageProps) {
  const { projectId } = await params;
  const config = PROJECT_TAB_SLICES["data-room"];
  return (
    <ProjectTabPlaceholder projectId={projectId} {...config} highlights={[...config.highlights]} />
  );
}
