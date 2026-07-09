export default function WorkspacesLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading workspaces">
      <div className="h-4 w-48 animate-pulse rounded bg-muted/60" />
      <div className="space-y-2">
        <div className="h-10 w-64 animate-pulse rounded bg-muted/60" />
        <div className="h-5 w-96 max-w-full animate-pulse rounded bg-muted/60" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
