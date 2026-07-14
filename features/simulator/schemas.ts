import { z } from "zod";

export const scenarioNameSchema = z.enum([
  "revenue_decline",
  "customer_churn",
  "lawsuit_loss",
  "price_change",
  "custom",
]);

export type ScenarioName = z.infer<typeof scenarioNameSchema>;

export const confidenceLevelSchema = z.enum(["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"]);

export const keyImpactSchema = z.object({
  area: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  severity: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])),
});

export const simulatorLlmOutputSchema = z.object({
  scenarioSummary: z.string().trim().min(1).max(4000),
  adjustedFinancialScore: z.coerce.number().min(0).max(100),
  adjustedRiskScore: z.coerce.number().min(0).max(100),
  keyImpacts: z.array(keyImpactSchema).max(20).default([]),
  updatedRecommendation: z.string().trim().min(1).max(4000),
  deltaFromBaseline: z.string().trim().min(1).max(4000),
  confidence: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(confidenceLevelSchema),
});

export type SimulatorLlmOutput = z.infer<typeof simulatorLlmOutputSchema>;

/** Accepts preset params with aliases from API docs (revenueChange / revenueChangePct). */
export const simulationParametersSchema = z
  .object({
    revenueChangePct: z.number().min(-100).max(100).optional(),
    revenueChange: z.number().min(-100).max(100).optional(),
    customerLost: z.union([z.string().trim().min(1).max(200), z.number()]).optional(),
    customerLoss: z.union([z.string().trim().min(1).max(200), z.number()]).optional(),
    lawsuitOutcome: z.enum(["loss", "settlement"]).optional(),
    amount: z.number().optional(),
    priceChangePct: z.number().min(-100).max(500).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .passthrough();

export type SimulationParameters = z.infer<typeof simulationParametersSchema>;

export const runSimulationBodySchema = z.object({
  scenarioName: scenarioNameSchema,
  parameters: simulationParametersSchema.default({}),
});

export const SCENARIO_PRESETS: Record<
  Exclude<ScenarioName, "custom">,
  { label: string; description: string; defaults: SimulationParameters }
> = {
  revenue_decline: {
    label: "Revenue decline",
    description: "Model a percentage drop in revenue.",
    defaults: { revenueChangePct: -20 },
  },
  customer_churn: {
    label: "Customer churn",
    description: "Model customer loss as a count or percentage.",
    defaults: { customerLost: "15%" },
  },
  lawsuit_loss: {
    label: "Lawsuit outcome",
    description: "Model litigation loss or settlement impact.",
    defaults: { lawsuitOutcome: "loss" },
  },
  price_change: {
    label: "Price change",
    description: "Model product or deal pricing change.",
    defaults: { priceChangePct: 10 },
  },
};

export function normalizeSimulationParameters(
  scenarioName: ScenarioName,
  raw: SimulationParameters,
): Record<string, unknown> {
  const input: Record<string, unknown> = { ...raw };

  if (input.revenueChange !== undefined && input.revenueChangePct === undefined) {
    input.revenueChangePct = input.revenueChange;
  }
  if (input.customerLoss !== undefined && input.customerLost === undefined) {
    input.customerLost = input.customerLoss;
  }

  delete input.revenueChange;
  delete input.customerLoss;

  const merged: Record<string, unknown> = {
    ...(scenarioName !== "custom" ? SCENARIO_PRESETS[scenarioName].defaults : {}),
    ...input,
  };

  switch (scenarioName) {
    case "revenue_decline":
      if (typeof merged.revenueChangePct !== "number") merged.revenueChangePct = -20;
      break;
    case "customer_churn":
      if (merged.customerLost === undefined) merged.customerLost = "15%";
      break;
    case "lawsuit_loss":
      if (merged.lawsuitOutcome !== "loss" && merged.lawsuitOutcome !== "settlement") {
        merged.lawsuitOutcome = "loss";
      }
      break;
    case "price_change":
      if (typeof merged.priceChangePct !== "number") merged.priceChangePct = 10;
      break;
    default:
      break;
  }

  return merged;
}
