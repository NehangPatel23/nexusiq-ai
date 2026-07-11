"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ProjectTab {
  label: string;
  href: string;
  segment: string;
}

export const PROJECT_TABS: ProjectTab[] = [
  { label: "Overview", href: "", segment: "" },
  { label: "Data Room", href: "/data-room", segment: "data-room" },
  { label: "Intelligence", href: "/intelligence", segment: "intelligence" },
  { label: "Chat", href: "/chat", segment: "chat" },
  { label: "Reports", href: "/reports", segment: "reports" },
  { label: "Timeline", href: "/timeline", segment: "timeline" },
  { label: "Graph", href: "/graph", segment: "graph" },
  { label: "Risks", href: "/risks", segment: "risks" },
  { label: "Contradictions", href: "/contradictions", segment: "contradictions" },
  { label: "Missing", href: "/missing", segment: "missing" },
  { label: "Simulator", href: "/simulator", segment: "simulator" },
  { label: "Actions", href: "/actions", segment: "actions" },
  { label: "History", href: "/history", segment: "history" },
];

interface ProjectShellNavProps {
  projectId: string;
}

export function ProjectShellNav({ projectId }: ProjectShellNavProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/projects/${projectId}`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScroll(el.scrollWidth > el.clientWidth + 2);
  }, []);

  useEffect(() => {
    checkOverflow();
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    window.addEventListener("resize", checkOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [checkOverflow]);

  const scrollBy = useCallback((direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="relative rounded-xl border border-border/50 bg-card/30 p-1">
      {canScroll && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 bg-background/80 shadow-sm backdrop-blur-sm sm:flex"
            aria-label="Scroll tabs left"
            onClick={() => scrollBy("left")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 bg-background/80 shadow-sm backdrop-blur-sm sm:flex"
            aria-label="Scroll tabs right"
            onClick={() => scrollBy("right")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </>
      )}

      <nav
        ref={scrollRef}
        aria-label="Project sections"
        className={cn(
          "scrollbar-nav overflow-x-auto scroll-smooth",
          canScroll ? "px-8 sm:px-10" : "px-2 sm:px-3",
        )}
        style={canScroll ? { scrollPaddingInline: "2rem" } : undefined}
      >
        <ul className="flex min-w-max gap-1 py-1" role="tablist">
          {PROJECT_TABS.map((tab) => {
            const href = `${basePath}${tab.href}`;
            const isActive =
              tab.segment === ""
                ? pathname === basePath || pathname === `${basePath}/`
                : pathname.startsWith(`${basePath}/${tab.segment}`);

            return (
              <li key={tab.segment || "overview"} role="presentation">
                <Link
                  href={href}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/75 hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
