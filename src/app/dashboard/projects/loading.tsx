import { Card } from "@/components/ui/card";

export default function ProjectsLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading projects">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 flex-1 max-w-sm animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="p-5">
            <div className="mb-3 h-5 w-20 animate-pulse rounded bg-muted" />
            <div className="mb-2 h-6 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>
    </div>
  );
}
