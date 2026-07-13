import { describe, expect, it } from "vitest";

import { agentSeedQuery } from "@/lib/ai/agents/prompts";
import {
  extractAgentScore,
  financialOutputSchema,
  fraudOutputSchema,
  parseAgentJson,
  riskOutputSchema,
} from "@/lib/ai/agents/schemas";
import {
  normalizeComplianceFindings,
  normalizeFinancialFindings,
  normalizeFraudFindings,
} from "@/lib/ai/agents/findings";

describe("agentSeedQuery", () => {
  it("returns retrieval-biased queries for each agent", () => {
    expect(agentSeedQuery("FINANCIAL")).toMatch(/financial/i);
    expect(agentSeedQuery("LEGAL")).toMatch(/contract/i);
    expect(agentSeedQuery("COMPLIANCE")).toMatch(/GDPR|SOX/i);
    expect(agentSeedQuery("RISK")).toMatch(/risk/i);
    expect(agentSeedQuery("FRAUD")).toMatch(/fraud/i);
  });
});

describe("agent zod parsers", () => {
  it("parses financial output and extracts score", () => {
    const output = parseAgentJson(
      "FINANCIAL",
      JSON.stringify({
        financialHealthScore: 82,
        recommendation: "Healthy",
        confidence: "HIGH",
        anomalies: [
          {
            title: "Margin dip",
            description: "Gross margin fell in Q4",
            severity: "MEDIUM",
            sourceChunkId: "chunk-1",
            documentId: "doc-1",
          },
        ],
      }),
    );

    expect(output.financialHealthScore).toBe(82);
    expect(extractAgentScore("FINANCIAL", output)).toBe(82);
    expect(normalizeFinancialFindings(output)).toHaveLength(1);
  });

  it("parses fraud output and normalizes indicators", () => {
    const output = parseAgentJson(
      "FRAUD",
      JSON.stringify({
        fraudRiskScore: 44,
        recommendation: "Review vendors",
        confidence: "MEDIUM",
        indicators: [
          {
            type: "invoice",
            title: "Duplicate invoice",
            description: "Same invoice number appears twice",
            severity: "HIGH",
            sourceChunkId: "chunk-9",
            documentId: "doc-9",
          },
        ],
      }),
    );

    expect(fraudOutputSchema.parse(output).fraudRiskScore).toBe(44);
    expect(normalizeFraudFindings(output)[0]?.category).toBe("invoice");
  });

  it("normalizes compliance gaps with missing status only", () => {
    const findings = normalizeComplianceFindings({
      auditReadinessScore: 55,
      recommendation: "Close gaps",
      confidence: "LOW",
      frameworkGaps: [
        {
          framework: "GDPR",
          requirement: "Data retention policy",
          status: "missing",
          remediation: "Publish policy",
        },
        {
          framework: "SOX",
          requirement: "Access controls",
          status: "met",
          evidence: "Control matrix uploaded",
        },
      ],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("HIGH");
  });

  it("accepts null optional strings in compliance output", () => {
    const output = parseAgentJson(
      "COMPLIANCE",
      JSON.stringify({
        auditReadinessScore: 48,
        recommendation: "Close GDPR and SOX gaps",
        confidence: "LOW",
        frameworkGaps: [
          {
            framework: "GDPR",
            requirement: "ROPA",
            status: "missing",
            evidence: null,
            remediation: null,
            sourceChunkId: null,
          },
        ],
        policyMappings: [{ policy: "Security policy", documentId: "doc-1", coverage: null }],
      }),
    );

    expect(output.frameworkGaps?.[0]?.remediation).toBeUndefined();
    expect(output.frameworkGaps?.[0]?.evidence).toBeUndefined();
    expect(output.frameworkGaps?.[0]?.sourceChunkId).toBeNull();
    expect(output.policyMappings?.[0]?.coverage).toBeUndefined();
    expect(normalizeComplianceFindings(output)).toHaveLength(1);
  });

  it("maps positional policyMapping arrays into objects", () => {
    const output = parseAgentJson(
      "COMPLIANCE",
      JSON.stringify({
        auditReadinessScore: 60,
        recommendation: "Map policies",
        confidence: "MEDIUM",
        policyMappings: [
          ["Security policy", "doc-1", "full"],
          ["Retention policy", "doc-2", null],
        ],
      }),
    );

    expect(output.policyMappings?.[0]).toEqual({
      policy: "Security policy",
      documentId: "doc-1",
      coverage: "full",
    });
    expect(output.policyMappings?.[1]?.policy).toBe("Retention policy");
    expect(output.policyMappings?.[1]?.coverage).toBeUndefined();
  });

  it("coerces string agent scores from ollama", () => {
    const output = parseAgentJson(
      "FINANCIAL",
      JSON.stringify({
        financialHealthScore: "77",
        recommendation: "Ok",
        confidence: "HIGH",
      }),
    );
    expect(output.financialHealthScore).toBe(77);
  });

  it("accepts risk heatmap entries without count and optional finding ids", () => {
    const output = parseAgentJson(
      "RISK",
      JSON.stringify({
        enterpriseRiskScore: 55,
        recommendation: "Address cyber and concentration risk",
        confidence: "MEDIUM",
        riskHeatmap: [
          { category: "Cyber", severity: "HIGH" },
          { category: "Financial", severity: "MEDIUM", count: 2 },
        ],
        findings: [
          {
            category: "Cyber",
            title: "Legacy encryption",
            description: "At-rest encryption gaps",
            severity: "HIGH",
          },
        ],
      }),
    );

    expect(output.enterpriseRiskScore).toBe(55);
    expect(output.riskHeatmap?.[0]?.count).toBe(0);
    expect(output.riskHeatmap?.[1]?.count).toBe(2);
    expect(output.findings?.[0]?.sourceChunkId).toBeUndefined();
    expect(riskOutputSchema.safeParse(output).success).toBe(true);
  });

  it("rejects invalid financial score range", () => {
    expect(() =>
      financialOutputSchema.parse({
        financialHealthScore: 120,
        recommendation: "Bad",
        confidence: "LOW",
      }),
    ).toThrow();
  });

  it("normalizes mixed-case severity and numeric variance fields from ollama", () => {
    const output = parseAgentJson(
      "FINANCIAL",
      JSON.stringify({
        financialHealthScore: 71,
        recommendation: "Monitor anomalies",
        confidence: "medium",
        anomalies: [
          {
            title: "Margin dip",
            description: "Gross margin fell",
            severity: "Medium",
            sourceChunkId: "chunk-1",
          },
          {
            title: "Expense spike",
            description: "Travel costs rose",
            severity: "Low",
          },
        ],
        varianceAnalysis: [
          { metric: "Revenue", expected: 1000000, actual: 920000, sourceChunkId: "chunk-2" },
          { metric: "EBITDA", expected: 12.5, actual: 10.1 },
        ],
      }),
    );

    expect(output.confidence).toBe("MEDIUM");
    expect(output.anomalies?.[0]?.severity).toBe("MEDIUM");
    expect(output.anomalies?.[1]?.severity).toBe("LOW");
    expect(output.varianceAnalysis?.[0]?.expected).toBe("1000000");
    expect(output.varianceAnalysis?.[0]?.actual).toBe("920000");
    expect(output.varianceAnalysis?.[1]?.expected).toBe("12.5");
  });

  it("maps numeric severity ranks from ollama to enum strings", () => {
    const output = parseAgentJson(
      "FINANCIAL",
      JSON.stringify({
        financialHealthScore: 65,
        recommendation: "Review flagged items",
        confidence: "LOW",
        anomalies: [
          { title: "A", description: "First", severity: 1 },
          { title: "B", description: "Second", severity: 2 },
          { title: "C", description: "Third", severity: 4 },
        ],
        invoiceFraudIndicators: [{ description: "Duplicate invoice", severity: 3 }],
      }),
    );

    expect(output.anomalies?.[0]?.severity).toBe("CRITICAL");
    expect(output.anomalies?.[1]?.severity).toBe("HIGH");
    expect(output.anomalies?.[2]?.severity).toBe("LOW");
    expect(output.invoiceFraudIndicators?.[0]?.severity).toBe("MEDIUM");
  });

  it("wraps concentration arrays into objects", () => {
    const output = parseAgentJson(
      "FINANCIAL",
      JSON.stringify({
        financialHealthScore: 70,
        recommendation: "Diversify vendors",
        confidence: "MEDIUM",
        vendorConcentration: [{ name: "Acme Corp", pct: 42 }],
        customerConcentration: [{ name: "BigCo", pct: 35 }],
      }),
    );

    expect(output.vendorConcentration).toEqual({
      topVendors: [{ name: "Acme Corp", pct: 42 }],
    });
    expect(output.customerConcentration).toEqual({
      topCustomers: [{ name: "BigCo", pct: 35 }],
    });
  });
});
