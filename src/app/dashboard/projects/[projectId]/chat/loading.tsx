export default function ChatLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading chat">
      <div className="h-8 w-52 animate-pulse rounded-lg bg-muted/50" />
      <div className="grid min-h-[650px] grid-cols-1 overflow-hidden rounded-2xl border border-border/60 lg:grid-cols-[230px_1fr]">
        <div className="space-y-3 border-r border-border/60 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-9 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
        <div className="space-y-5 p-6">
          <div className="h-20 w-3/4 animate-pulse rounded-2xl bg-muted/40" />
          <div className="ml-auto h-14 w-1/2 animate-pulse rounded-2xl bg-primary/10" />
        </div>
      </div>
    </div>
  );
}
