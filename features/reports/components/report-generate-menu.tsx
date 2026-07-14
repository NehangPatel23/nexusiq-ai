"use client";

import type { ReportType } from "@prisma/client";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import {
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TYPE_ICONS,
  REPORT_TYPE_LABELS,
  REPORT_TYPES,
  reportTypeAccent,
} from "../lib/labels";

type ReportGenerateMenuProps = {
  onGenerate: (reportType: ReportType) => void;
  disabled?: boolean;
  generating?: boolean;
};

export function ReportGenerateMenu({
  onGenerate,
  disabled,
  generating,
}: ReportGenerateMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled || generating} aria-label="Generate report">
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          Generate report
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Choose a report type</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {REPORT_TYPES.map((type) => {
          const Icon = REPORT_TYPE_ICONS[type];
          return (
            <DropdownMenuItem
              key={type}
              className="items-start gap-3 py-2.5"
              onSelect={() => onGenerate(type)}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                  reportTypeAccent(type),
                )}
                aria-hidden="true"
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{REPORT_TYPE_LABELS[type]}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {REPORT_TYPE_DESCRIPTIONS[type]}
                </span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
