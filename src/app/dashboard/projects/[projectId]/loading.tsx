import { Card } from "@/components/ui/card";

export default function ProjectLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading project">
      <div className="space-y-2">
        <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-2/3 max-w-md animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-9 w-24 shrink-0 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <Card className="p-6">
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </Card>
    </div>
  );
}
