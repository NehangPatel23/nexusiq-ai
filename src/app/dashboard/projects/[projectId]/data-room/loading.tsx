export default function DataRoomLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading data room">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted/40" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted/30" />
      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <div className="h-64 animate-pulse rounded-xl bg-muted/30" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/20" />
        <div className="hidden h-64 animate-pulse rounded-xl bg-muted/30 lg:block" />
      </div>
    </div>
  );
}
