interface ProcessingProgressProps {
  percent: number;
  label?: string;
  hint?: string;
}

export function ProcessingProgress({
  percent,
  label = "Documents processed",
  hint,
}: ProcessingProgressProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{clamped}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted/60"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full max-w-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
