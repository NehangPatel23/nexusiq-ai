export default function ProjectLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading project section">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted/40" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted/30" />
      <div className="space-y-3 rounded-xl border border-border/40 bg-card/20 p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-muted/40" />
        <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted/30" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted/30" />
      </div>
    </div>
  );
}
