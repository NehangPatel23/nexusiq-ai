"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface TruncateTooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}

function isElementTruncated(el: HTMLElement) {
  // scrollWidth reflects full content; clientWidth is the visible box
  return el.scrollWidth > el.clientWidth + 1;
}

export function TruncateTooltip({
  content,
  children,
  className,
  side = "top",
  sideOffset = 6,
}: TruncateTooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setTruncated(isElementTruncated(el));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const runCheck = () => requestAnimationFrame(checkTruncation);

    runCheck();
    const observer = new ResizeObserver(runCheck);
    observer.observe(el);
    if (el.parentElement) observer.observe(el.parentElement);

    return () => observer.disconnect();
  }, [checkTruncation, content]);

  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>
        <span
          ref={ref}
          className={className}
          onPointerEnter={checkTruncation}
          onFocus={checkTruncation}
        >
          {children ?? content}
        </span>
      </TooltipTrigger>
      {truncated && (
        <TooltipContent side={side} sideOffset={sideOffset} className="max-w-sm break-words">
          {content}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

interface FileNameTooltipProps {
  name: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

/** Always-on tooltip for document file names in tables */
export function FileNameTooltip({ name, children, side = "top" }: FileNameTooltipProps) {
  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={8}
        className={cn(
          "max-w-md break-all border-primary/15 bg-card/95 px-3 py-2 text-xs font-medium",
          "shadow-xl shadow-black/40 ring-1 ring-white/5",
        )}
      >
        {name}
      </TooltipContent>
    </Tooltip>
  );
}

interface SidebarTooltipProps {
  label: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

/** Tooltip styled for collapsed sidebar nav items */
export function SidebarTooltip({ label, children, side = "right" }: SidebarTooltipProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={10}
        className={cn(
          "border-primary/20 bg-card/95 px-3 py-2 text-[13px] font-medium tracking-tight",
          "shadow-xl shadow-black/40 ring-1 ring-white/5",
        )}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
