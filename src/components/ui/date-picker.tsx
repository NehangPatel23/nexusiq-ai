"use client";

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDateValue(isoOrYmd: string | null | undefined): Date | null {
  if (!isoOrYmd) return null;
  const raw = isoOrYmd.includes("T") ? isoOrYmd.slice(0, 10) : isoOrYmd;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date | null, placeholder: string): string {
  if (!date) return placeholder;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

type DatePickerProps = {
  value?: string | null;
  onChange: (ymd: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Optional min/max as YYYY-MM-DD */
  min?: string;
  max?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  id,
  disabled,
  className,
  min,
  max,
}: DatePickerProps) {
  const selected = toDateValue(value);
  const minDate = toDateValue(min);
  const maxDate = toDateValue(max);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => selected ?? startOfDay(new Date()));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setCursor(selected);
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const total = daysInMonth(year, month);
    const leading = Array.from({ length: firstDow }, () => null as number | null);
    const days = Array.from({ length: total }, (_, i) => i + 1);
    return [...leading, ...days];
  }, [cursor]);

  function isDisabled(day: number): boolean {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  function isSelected(day: number): boolean {
    if (!selected) return false;
    return (
      selected.getFullYear() === cursor.getFullYear() &&
      selected.getMonth() === cursor.getMonth() &&
      selected.getDate() === day
    );
  }

  function isToday(day: number): boolean {
    const today = startOfDay(new Date());
    return (
      today.getFullYear() === cursor.getFullYear() &&
      today.getMonth() === cursor.getMonth() &&
      today.getDate() === day
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm",
          "ring-offset-background transition-colors hover:border-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground",
        )}
      >
        <span className="inline-flex items-center gap-2 truncate">
          <CalendarIcon className="h-4 w-4 shrink-0 text-primary/80" aria-hidden="true" />
          {formatDisplay(selected, placeholder)}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className={cn(
            "absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[18.5rem] overflow-hidden rounded-2xl border border-border/60",
            "bg-[hsl(var(--glass))] p-3 shadow-xl backdrop-blur-md",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(217_91%_60%/0.12),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Previous month"
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="font-display text-sm font-semibold tracking-tight">
                {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Next month"
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, index) => {
                if (day === null) {
                  return <span key={`e-${index}`} className="h-9" />;
                }
                const disabledDay = isDisabled(day);
                const selectedDay = isSelected(day);
                const today = isToday(day);
                return (
                  <button
                    key={`${cursor.getFullYear()}-${cursor.getMonth()}-${day}`}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => {
                      const next = new Date(cursor.getFullYear(), cursor.getMonth(), day);
                      onChange(toYmd(next));
                      setOpen(false);
                    }}
                    className={cn(
                      "relative h-9 rounded-lg text-sm tabular-nums transition-colors",
                      "hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
                      selectedDay && "bg-primary text-primary-foreground hover:bg-primary",
                      !selectedDay && today && "ring-1 ring-primary/50",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border/50 pt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  const today = startOfDay(new Date());
                  onChange(toYmd(today));
                  setCursor(today);
                  setOpen(false);
                }}
              >
                Today
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
