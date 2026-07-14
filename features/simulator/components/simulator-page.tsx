"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  FlaskConical,
  History,
  Loader2,
  Minus,
  Scale,
  ShieldAlert,
  TrendingDown,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectTabHeader } from "@/features/projects/components/project-tab-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentThinking } from "@/features/intelligence/components/agent-thinking";
import { useBackgroundSimulation } from "@/features/simulator/hooks/use-background-simulation";
import { startBackgroundSimulation } from "@/features/simulator/lib/background-simulation-runner";
import {
  SCENARIO_PRESETS,
  scenarioNameSchema,
  type ScenarioName,
  type SimulationParameters,
} from "@/features/simulator/schemas";
import type { SimulationRunView } from "@/lib/ai/simulator";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

type Prerequisites = { financial: boolean; risk: boolean; ready: boolean };

type SimulatorPageProps = {
  projectId: string;
  projectName: string;
  initialSimulations: SimulationRunView[];
  initialPrerequisites: Prerequisites;
};

const SCENARIO_OPTIONS = scenarioNameSchema.options;

const SCENARIO_ICONS: Record<ScenarioName, typeof TrendingDown> = {
  revenue_decline: TrendingDown,
  customer_churn: Users,
  lawsuit_loss: Scale,
  price_change: CircleDot,
  custom: FlaskConical,
};

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function confidenceBadgeClass(confidence: string | null | undefined) {
  switch (confidence) {
    case "HIGH":
      return "badge-tint-emerald";
    case "MEDIUM":
      return "border-sky-500/40 bg-sky-500/10 text-tint-sky";
    case "LOW":
      return "badge-tint-amber";
    case "INSUFFICIENT":
      return "border-border/60 bg-muted/40 text-muted-foreground";
    default:
      return "";
  }
}

function severityBadgeClass(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "badge-tint-rose";
    case "HIGH":
      return "border-orange-500/50 bg-orange-500/15 text-tint-orange";
    case "MEDIUM":
      return "badge-tint-amber";
    default:
      return "border-border/60 bg-muted/30 text-muted-foreground";
  }
}

function DeltaChip({
  delta,
  invertMeaning = false,
}: {
  delta: number;
  /** When true, higher is worse (enterprise risk). */
  invertMeaning?: boolean;
}) {
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="h-3 w-3" aria-hidden />
        Unchanged
      </span>
    );
  }
  const up = delta > 0;
  const worse = invertMeaning ? up : !up;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        worse ? "bg-amber-500/15 text-tint-amber" : "bg-emerald-500/15 text-tint-emerald",
      )}
    >
      {up ? (
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      ) : (
        <ArrowDownRight className="h-3 w-3" aria-hidden />
      )}
      {up ? "+" : ""}
      {delta.toFixed(1)}
    </span>
  );
}

function ScoreCompareCard({
  label,
  icon: Icon,
  baseline,
  simulated,
  delta,
  invertMeaning,
}: {
  label: string;
  icon: typeof ShieldAlert;
  baseline: number | null;
  simulated: number;
  delta: number;
  invertMeaning?: boolean;
}) {
  const barMax = 100;
  const baselinePct = baseline === null ? 0 : Math.min(100, Math.max(0, (baseline / barMax) * 100));
  const simulatedPct = Math.min(100, Math.max(0, (simulated / barMax) * 100));

  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-b from-background/60 to-background/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
          {label}
        </div>
        <DeltaChip delta={delta} invertMeaning={invertMeaning} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Baseline</p>
          <p className="text-lg font-semibold tabular-nums text-muted-foreground">
            {formatScore(baseline)}
          </p>
        </div>
        <ArrowRight className="mb-1.5 h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Simulated</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatScore(simulated)}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-1.5" aria-hidden>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-muted-foreground/40 transition-[width] duration-500"
            style={{ width: `${baselinePct}%` }}
          />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              invertMeaning ? "bg-amber-400/80" : "bg-primary/80",
            )}
            style={{ width: `${simulatedPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function scenarioLabel(name: string) {
  if (name === "custom") return "Custom";
  return SCENARIO_PRESETS[name as Exclude<ScenarioName, "custom">]?.label ?? name.replace(/_/g, " ");
}

export function SimulatorPageClient({
  projectId,
  projectName,
  initialSimulations,
  initialPrerequisites,
}: SimulatorPageProps) {
  const [simulations, setSimulations] = useState(initialSimulations);
  const [prerequisites, setPrerequisites] = useState(initialPrerequisites);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSimulations[0]?.id ?? null,
  );
  const [scenarioName, setScenarioName] = useState<ScenarioName>("revenue_decline");
  const [revenueChangePct, setRevenueChangePct] = useState(-20);
  const [customerLost, setCustomerLost] = useState("15%");
  const [lawsuitOutcome, setLawsuitOutcome] = useState<"loss" | "settlement">("loss");
  const [lawsuitAmount, setLawsuitAmount] = useState("");
  const [priceChangePct, setPriceChangePct] = useState(10);
  const [customNotes, setCustomNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const background = useBackgroundSimulation(projectId);
  const prevSimStatus = useRef(background.status);
  const running = background.status === "running";

  const selected = useMemo(
    () => simulations.find((s) => s.id === selectedId) ?? simulations[0] ?? null,
    [simulations, selectedId],
  );

  useEffect(() => {
    if (scenarioName === "custom") return;
    const defaults = SCENARIO_PRESETS[scenarioName].defaults;
    if (typeof defaults.revenueChangePct === "number") {
      setRevenueChangePct(defaults.revenueChangePct);
    }
    if (defaults.customerLost !== undefined) {
      setCustomerLost(String(defaults.customerLost));
    }
    if (defaults.lawsuitOutcome === "loss" || defaults.lawsuitOutcome === "settlement") {
      setLawsuitOutcome(defaults.lawsuitOutcome);
    }
    if (typeof defaults.priceChangePct === "number") {
      setPriceChangePct(defaults.priceChangePct);
    }
  }, [scenarioName]);

  const buildParameters = useCallback((): SimulationParameters => {
    switch (scenarioName) {
      case "revenue_decline":
        return { revenueChangePct };
      case "customer_churn":
        return { customerLost };
      case "lawsuit_loss":
        return {
          lawsuitOutcome,
          ...(lawsuitAmount.trim() ? { amount: Number(lawsuitAmount) } : {}),
        };
      case "price_change":
        return { priceChangePct };
      case "custom":
        return {
          notes: customNotes.trim() || undefined,
          ...(revenueChangePct !== 0 ? { revenueChangePct } : {}),
          ...(customerLost.trim() ? { customerLost } : {}),
          ...(priceChangePct !== 0 ? { priceChangePct } : {}),
        };
      default:
        return {};
    }
  }, [
    scenarioName,
    revenueChangePct,
    customerLost,
    lawsuitOutcome,
    lawsuitAmount,
    priceChangePct,
    customNotes,
  ]);

  async function refreshList() {
    const response = await fetch(`/api/projects/${projectId}/simulations`);
    const body = (await response.json()) as ApiEnvelope<{
      simulations: SimulationRunView[];
      prerequisites: Prerequisites;
    }>;
    if (!body.success) return;
    setSimulations(body.data.simulations);
    setPrerequisites(body.data.prerequisites);
  }

  useEffect(() => {
    if (prevSimStatus.current === "running" && background.status === "idle") {
      if (background.result) {
        setSimulations((prev) => {
          if (prev.some((run) => run.id === background.result!.id)) return prev;
          return [background.result!, ...prev];
        });
        setSelectedId(background.result.id);
        setError(null);
      } else if (background.errorMessage) {
        setError(background.errorMessage);
      }
      void refreshList();
    }
    prevSimStatus.current = background.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- transition-driven refresh
  }, [background.status, background.result, background.errorMessage, projectId]);

  useEffect(() => {
    if (background.status === "running") {
      setError(null);
    } else if (background.errorMessage && !background.result) {
      setError(background.errorMessage);
    }
  }, [background.status, background.errorMessage, background.result]);

  function handleRun() {
    if (!prerequisites.ready) {
      toast.error("Run Financial and Risk agents first");
      return;
    }
    setError(null);
    startBackgroundSimulation({
      projectId,
      scenarioName,
      parameters: buildParameters(),
    });
  }

  return (
    <div className="space-y-6">
      <ProjectTabHeader
        icon={FlaskConical}
        title="Risk Simulator"
        description="Model what-if pressure on Financial and Risk baselines. Simulations keep running if you leave this tab. Results are saved separately — live agent scores stay unchanged."
        meta={
          <>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                prerequisites.financial
                  ? "badge-tint-emerald"
                  : "border-border/60 bg-muted/40 text-muted-foreground",
              )}
            >
              {prerequisites.financial ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              )}
              Financial
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                prerequisites.risk
                  ? "badge-tint-emerald"
                  : "border-border/60 bg-muted/40 text-muted-foreground",
              )}
            >
              {prerequisites.risk ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              )}
              Risk
            </span>
            {simulations.length > 0 ? (
              <Badge variant="outline" className="rounded-full">
                {simulations.length} run{simulations.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </>
        }
      />

      {!prerequisites.ready ? (
        <div
          className="flex flex-col gap-3 rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-500/10 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tint-amber" aria-hidden />
            <div>
              <p className="font-medium text-foreground">Need baseline agent runs</p>
              <p className="text-sm text-muted-foreground">
                Complete {!prerequisites.financial && "Financial"}
                {!prerequisites.financial && !prerequisites.risk && " and "}
                {!prerequisites.risk && "Risk"} scans on Intelligence before running scenarios.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link href={`/dashboard/projects/${projectId}/intelligence`}>Open Intelligence</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.35fr)]">
        <section
          className="space-y-5 rounded-2xl border border-border/60 bg-card/50 p-5 shadow-sm backdrop-blur-sm"
          aria-labelledby="scenario-controls"
        >
          <div>
            <h2 id="scenario-controls" className="text-sm font-semibold tracking-wide">
              Configure scenario
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a preset, tune levers, then run against your latest baselines.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="sr-only">Scenario type</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCENARIO_OPTIONS.map((name) => {
                const Icon = SCENARIO_ICONS[name];
                const active = scenarioName === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setScenarioName(name)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                        : "border-border/50 bg-background/30 hover:border-border hover:bg-muted/30",
                    )}
                    aria-pressed={active}
                  >
                    <span className="flex items-center gap-2">
                      <Icon
                        className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")}
                        aria-hidden
                      />
                      <span className="text-sm font-medium">{scenarioLabel(name)}</span>
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                      {name === "custom"
                        ? "Combine levers freely"
                        : SCENARIO_PRESETS[name].description}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-4 rounded-xl border border-border/40 bg-background/25 p-4">
            {(scenarioName === "revenue_decline" || scenarioName === "custom") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="revenue-change">Revenue change</Label>
                  <span className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-xs tabular-nums">
                    {revenueChangePct > 0 ? "+" : ""}
                    {revenueChangePct}%
                  </span>
                </div>
                <input
                  id="revenue-change"
                  type="range"
                  min={-50}
                  max={50}
                  step={1}
                  value={revenueChangePct}
                  onChange={(e) => setRevenueChangePct(Number(e.target.value))}
                  className="w-full accent-primary"
                  aria-valuetext={`${revenueChangePct} percent`}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>−50%</span>
                  <span>0</span>
                  <span>+50%</span>
                </div>
              </div>
            )}

            {(scenarioName === "customer_churn" || scenarioName === "custom") && (
              <div className="space-y-2">
                <Label htmlFor="customer-lost">Customers lost</Label>
                <Input
                  id="customer-lost"
                  value={customerLost}
                  onChange={(e) => setCustomerLost(e.target.value)}
                  placeholder="15% or 1,200 accounts"
                />
              </div>
            )}

            {scenarioName === "lawsuit_loss" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lawsuit-outcome">Outcome</Label>
                  <Select
                    value={lawsuitOutcome}
                    onValueChange={(v) => setLawsuitOutcome(v as "loss" | "settlement")}
                  >
                    <SelectTrigger id="lawsuit-outcome">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loss">Loss</SelectItem>
                      <SelectItem value="settlement">Settlement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lawsuit-amount">Amount (optional)</Label>
                  <Input
                    id="lawsuit-amount"
                    type="number"
                    inputMode="decimal"
                    value={lawsuitAmount}
                    onChange={(e) => setLawsuitAmount(e.target.value)}
                    placeholder="e.g. 2500000"
                  />
                </div>
              </div>
            )}

            {(scenarioName === "price_change" || scenarioName === "custom") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="price-change">Price change</Label>
                  <span className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-xs tabular-nums">
                    {priceChangePct > 0 ? "+" : ""}
                    {priceChangePct}%
                  </span>
                </div>
                <input
                  id="price-change"
                  type="range"
                  min={-50}
                  max={100}
                  step={1}
                  value={priceChangePct}
                  onChange={(e) => setPriceChangePct(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>−50%</span>
                  <span>0</span>
                  <span>+100%</span>
                </div>
              </div>
            )}

            {scenarioName === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom-notes">Scenario notes</Label>
                <Input
                  id="custom-notes"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Describe assumptions the model should honor"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRun}
              disabled={running || !prerequisites.ready}
              className="w-full"
              size="lg"
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Modeling impact…
                </>
              ) : (
                <>
                  <FlaskConical className="mr-2 h-4 w-4" aria-hidden />
                  Run simulation
                </>
              )}
            </Button>
            {running ? (
              <AgentThinking label="Modeling scenario impact — you can leave this tab" />
            ) : null}
            {error ? (
              <p
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
        </section>

        <section
          className="space-y-5 rounded-2xl border border-border/60 bg-card/50 p-5 shadow-sm backdrop-blur-sm"
          aria-labelledby="delta-panel"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="delta-panel" className="text-sm font-semibold tracking-wide">
                Delta vs baseline
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Compare simulated scores to your latest Financial and Risk agent runs.
              </p>
            </div>
            {selected ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {scenarioLabel(selected.scenarioName)}
                </Badge>
                {selected.confidence ? (
                  <Badge
                    variant="outline"
                    className={cn(confidenceBadgeClass(selected.confidence))}
                  >
                    {selected.confidence}
                  </Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {new Date(selected.createdAt).toLocaleString()}
                </span>
              </div>
            ) : null}
          </div>

          {!selected ? (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-14 text-center">
              <FlaskConical className="mx-auto mb-3 h-9 w-9 text-muted-foreground/80" aria-hidden />
              <p className="font-medium">No simulations yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Configure a scenario on the left and run a simulation to see score movement,
                recommendation changes, and key impacts.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <ScoreCompareCard
                  label="Financial health"
                  icon={TrendingDown}
                  baseline={selected.baselineScores.financial}
                  simulated={selected.simulatedScores.financial}
                  delta={selected.delta.financialDelta}
                />
                <ScoreCompareCard
                  label="Enterprise risk"
                  icon={ShieldAlert}
                  baseline={selected.baselineScores.risk}
                  simulated={selected.simulatedScores.risk}
                  delta={selected.delta.riskDelta}
                  invertMeaning
                />
              </div>

              {(selected.recommendation || selected.delta.narrative) && (
                <div className="grid gap-3 lg:grid-cols-2">
                  {selected.recommendation ? (
                    <div className="rounded-xl border border-border/45 bg-background/35 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Updated recommendation
                      </p>
                      <p className="mt-2 text-sm leading-relaxed">{selected.recommendation}</p>
                    </div>
                  ) : null}
                  {selected.delta.narrative ? (
                    <div className="rounded-xl border border-border/45 bg-background/35 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        What changed
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {selected.delta.narrative}
                      </p>
                      {selected.delta.scenarioSummary ? (
                        <p className="mt-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                          {selected.delta.scenarioSummary}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              {selected.keyImpacts.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Key impacts ({selected.keyImpacts.length})
                  </p>
                  <ul className="space-y-2" aria-label="Key impacts">
                    {selected.keyImpacts.map((impact, index) => (
                      <li
                        key={`${impact.area}-${index}`}
                        className="flex gap-3 rounded-xl border border-border/40 bg-background/30 px-3 py-3"
                      >
                        <span
                          className={cn(
                            "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                            impact.severity === "CRITICAL" || impact.severity === "HIGH"
                              ? "bg-orange-400"
                              : impact.severity === "MEDIUM"
                                ? "bg-amber-300"
                                : "bg-muted-foreground",
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{impact.area}</span>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", severityBadgeClass(impact.severity))}
                            >
                              {impact.severity}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm leading-snug text-muted-foreground">
                            {impact.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <section
        className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-5"
        aria-labelledby="simulation-history"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h2 id="simulation-history" className="text-sm font-semibold tracking-wide">
              Run history
            </h2>
          </div>
          {simulations.length > 0 ? (
            <p className="text-xs text-muted-foreground">Select a run to reopen its delta</p>
          ) : null}
        </div>
        {simulations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Past simulation runs will appear here.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {simulations.map((run) => {
              const active = selected?.id === run.id;
              return (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(run.id)}
                    className={cn(
                      "flex w-full flex-col gap-2 rounded-xl border px-3.5 py-3 text-left transition-colors",
                      active
                        ? "border-primary/45 bg-primary/10 ring-1 ring-primary/25"
                        : "border-border/50 bg-background/30 hover:bg-muted/35",
                    )}
                    aria-pressed={active}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{scenarioLabel(run.scenarioName)}</span>
                      {run.confidence ? (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", confidenceBadgeClass(run.confidence))}
                        >
                          {run.confidence}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        Fin {formatScore(run.simulatedScores.financial)}
                        <DeltaChip delta={run.delta.financialDelta} />
                      </span>
                      <span className="inline-flex items-center gap-1">
                        Risk {formatScore(run.simulatedScores.risk)}
                        <DeltaChip delta={run.delta.riskDelta} invertMeaning />
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/80">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
