"use client";

import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgentThinking } from "@/features/intelligence/components/agent-thinking";
import { cn } from "@/lib/utils";

export type GenerationStep = "assemble" | "generate" | "persist" | "done" | "error";

const STEPS: Array<{ id: GenerationStep; label: string }> = [
  { id: "assemble", label: "Assemble intelligence context" },
  { id: "generate", label: "Build report narrative" },
  { id: "persist", label: "Save & prepare export" },
];

type ReportGenerationModalProps = {
  open: boolean;
  step: GenerationStep;
  reportLabel?: string;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
};

export function ReportGenerationModal({
  open,
  step,
  reportLabel,
  errorMessage,
  onOpenChange,
}: ReportGenerationModalProps) {
  const activeIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="report-gen-desc">
        <DialogHeader>
          <DialogTitle>Generating report</DialogTitle>
          <DialogDescription id="report-gen-desc">
            {reportLabel
              ? `Building ${reportLabel} from the latest agent and consensus outputs.`
              : "Assembling diligence intelligence into an exportable report."}
          </DialogDescription>
        </DialogHeader>

        {step === "error" ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {errorMessage ?? "Report generation failed."}
          </div>
        ) : (
          <div className="space-y-4">
            <AgentThinking label="Working on your report" />
            <ol className="space-y-2" aria-label="Generation progress">
              {STEPS.map((item, index) => {
                const complete = step === "done" || (activeIndex >= 0 && index < activeIndex);
                const current = item.id === step;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                      current && "border-primary/40 bg-primary/5",
                      complete && "border-border/60 text-muted-foreground",
                      !current && !complete && "border-border/40 text-muted-foreground/70",
                    )}
                  >
                    {current ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
                    ) : (
                      <span
                        className={cn(
                          "flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px]",
                          complete ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                        aria-hidden="true"
                      >
                        {complete ? "✓" : index + 1}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
