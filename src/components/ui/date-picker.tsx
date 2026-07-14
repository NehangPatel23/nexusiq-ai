"use client";

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type PickerView = "day" | "month" | "year";

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

function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
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
  /** Show a Clear control that emits an empty string. */
  allowClear?: boolean;
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
  allowClear = false,
}: DatePickerProps) {
  const selected = toDateValue(value);
  const minDate = toDateValue(min);
  const maxDate = toDateValue(max);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PickerView>("day");
  const [cursor, setCursor] = useState(() => selected ?? startOfDay(new Date()));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setCursor(selected);
  }, [selected]);

  useEffect(() => {
    if (!open) {
      setView("day");
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (view !== "day") {
          setView(view === "year" ? "month" : "day");
          return;
        }
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, view]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const decadeStart = Math.floor(year / 12) * 12;

  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const total = daysInMonth(year, month);
    const leading = Array.from({ length: firstDow }, () => null as number | null);
    const days = Array.from({ length: total }, (_, i) => i + 1);
    return [...leading, ...days];
  }, [year, month]);

  const yearOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => decadeStart + i),
    [decadeStart],
  );

  function isDisabled(day: number): boolean {
    const date = new Date(year, month, day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  function isMonthDisabled(monthIndex: number): boolean {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex, daysInMonth(year, monthIndex));
    if (minDate && end < minDate) return true;
    if (maxDate && start > maxDate) return true;
    return false;
  }

  function isYearDisabled(y: number): boolean {
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    if (minDate && end < minDate) return true;
    if (maxDate && start > maxDate) return true;
    return false;
  }

  function isSelected(day: number): boolean {
    if (!selected) return false;
    return (
      selected.getFullYear() === year &&
      selected.getMonth() === month &&
      selected.getDate() === day
    );
  }

  function isToday(day: number): boolean {
    const today = startOfDay(new Date());
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  }

  function stepHeader(delta: number) {
    if (view === "day") {
      setCursor(new Date(year, month + delta, 1));
      return;
    }
    if (view === "month") {
      setCursor(new Date(year + delta, month, clampDay(year + delta, month, cursor.getDate())));
      return;
    }
    setCursor(
      new Date(year + delta * 12, month, clampDay(year + delta * 12, month, cursor.getDate())),
    );
  }

  function selectMonth(monthIndex: number) {
    setCursor(new Date(year, monthIndex, clampDay(year, monthIndex, cursor.getDate())));
    setView("day");
  }

  function selectYear(nextYear: number) {
    setCursor(
      new Date(nextYear, month, clampDay(nextYear, month, cursor.getDate())),
    );
    setView("month");
  }

  const headerLabel =
    view === "day"
      ? null
      : view === "month"
        ? String(year)
        : `${decadeStart} – ${decadeStart + 11}`;

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
            <div className="flex items-center justify-between gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label={
                  view === "day"
                    ? "Previous month"
                    : view === "month"
                      ? "Previous year"
                      : "Previous years"
                }
                onClick={() => stepHeader(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {view === "day" ? (
                <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-1.5 py-0.5 font-display text-sm font-semibold tracking-tight",
                      "hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    aria-label={`Select month, currently ${MONTHS[month]}`}
                    onClick={() => setView("month")}
                  >
                    {MONTHS[month]}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-1.5 py-0.5 font-display text-sm font-semibold tracking-tight tabular-nums",
                      "hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    aria-label={`Select year, currently ${year}`}
                    onClick={() => setView("year")}
                  >
                    {year}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "min-w-0 flex-1 rounded-md px-2 py-0.5 font-display text-sm font-semibold tracking-tight",
                    "hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={
                    view === "month" ? "Back to day view" : "Back to month view"
                  }
                  onClick={() => setView(view === "year" ? "month" : "day")}
                >
                  {headerLabel}
                </button>
              )}

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label={
                  view === "day"
                    ? "Next month"
                    : view === "month"
                      ? "Next year"
                      : "Next years"
                }
                onClick={() => stepHeader(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {view === "day" && (
              <>
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
                        key={`${year}-${month}-${day}`}
                        type="button"
                        disabled={disabledDay}
                        onClick={() => {
                          const next = new Date(year, month, day);
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
              </>
            )}

            {view === "month" && (
              <div className="grid grid-cols-3 gap-1.5" role="listbox" aria-label="Select month">
                {MONTHS.map((label, monthIndex) => {
                  const active = monthIndex === month;
                  const disabledMonth = isMonthDisabled(monthIndex);
                  return (
                    <button
                      key={label}
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={disabledMonth}
                      onClick={() => selectMonth(monthIndex)}
                      className={cn(
                        "h-10 rounded-lg text-sm transition-colors",
                        "hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
                        active && "bg-primary text-primary-foreground hover:bg-primary",
                      )}
                    >
                      {label.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            )}

            {view === "year" && (
              <div className="grid grid-cols-3 gap-1.5" role="listbox" aria-label="Select year">
                {yearOptions.map((y) => {
                  const active = y === year;
                  const disabledYear = isYearDisabled(y);
                  return (
                    <button
                      key={y}
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={disabledYear}
                      onClick={() => selectYear(y)}
                      className={cn(
                        "h-10 rounded-lg text-sm tabular-nums transition-colors",
                        "hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
                        active && "bg-primary text-primary-foreground hover:bg-primary",
                      )}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border/50 pt-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => {
                    const today = startOfDay(new Date());
                    onChange(toYmd(today));
                    setCursor(today);
                    setView("day");
                    setOpen(false);
                  }}
                >
                  Today
                </Button>
                {allowClear ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => {
                      onChange("");
                      setView("day");
                      setOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
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
