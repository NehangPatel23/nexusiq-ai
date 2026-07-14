/**
 * Generates a 3-page aesthetic pitch PDF for NexusIQ-AI.
 * Usage: pnpm exec tsx scripts/generate-pitch-pdf.tsx
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  renderToFile,
} from "@react-pdf/renderer";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "docs/pitch/NexusIQ-AI-Problem-Solution.pdf");
const DIAGRAM = join(ROOT, "docs/pitch/nexusiq-solution-architecture.png");
const FONTS = join(ROOT, "docs/pitch/fonts");

Font.register({
  family: "IBMPlexSans",
  fonts: [
    { src: join(FONTS, "IBMPlexSans-Regular.ttf"), fontWeight: 400 },
    { src: join(FONTS, "IBMPlexSans-Medium.ttf"), fontWeight: 500 },
    { src: join(FONTS, "IBMPlexSans-SemiBold.ttf"), fontWeight: 600 },
    { src: join(FONTS, "IBMPlexSans-Bold.ttf"), fontWeight: 700 },
  ],
});

// Prefer whole-word wrapping over mid-word hyphenation.
Font.registerHyphenationCallback((word) => [word]);

const C = {
  bg: "#0B1220",
  bgAlt: "#111827",
  card: "#152033",
  cardBorder: "#243047",
  ink: "#E8EEF7",
  muted: "#94A3B8",
  soft: "#CBD5E1",
  accent: "#38BDF8",
  accentDim: "#0EA5E9",
  line: "#1E293B",
  warm: "#F8FAFC",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    color: C.ink,
    fontFamily: "IBMPlexSans",
    fontWeight: 400,
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 44,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  brand: {
    fontSize: 10,
    letterSpacing: 2.4,
    color: C.accent,
    fontWeight: 700,
  },
  pageLabel: {
    fontSize: 8.5,
    color: C.muted,
    letterSpacing: 1.1,
    fontWeight: 500,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7.5,
    color: C.muted,
    fontWeight: 400,
  },
  kicker: {
    fontSize: 8.5,
    letterSpacing: 2.2,
    color: C.accent,
    marginBottom: 6,
    fontWeight: 700,
  },
  h1: {
    fontSize: 22,
    lineHeight: 1.28,
    color: C.warm,
    fontWeight: 700,
    marginBottom: 10,
  },
  h1Compact: {
    fontSize: 18,
    lineHeight: 1.28,
    color: C.warm,
    fontWeight: 700,
    marginBottom: 8,
  },
  h2: {
    fontSize: 12.5,
    color: C.warm,
    fontWeight: 700,
    marginBottom: 7,
    marginTop: 2,
  },
  lead: {
    fontSize: 10.5,
    lineHeight: 1.55,
    color: C.soft,
    marginBottom: 14,
  },
  body: {
    fontSize: 9.5,
    lineHeight: 1.52,
    color: C.soft,
    marginBottom: 8,
  },
  bodyTight: {
    fontSize: 8.5,
    lineHeight: 1.45,
    color: C.soft,
  },
  accentRule: {
    width: 34,
    height: 3,
    backgroundColor: C.accent,
    marginBottom: 12,
    borderRadius: 2,
  },
  painGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
    marginBottom: 12,
  },
  painCard: {
    width: "48.6%",
    backgroundColor: C.bgAlt,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 6,
    padding: 10,
  },
  painTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: C.accent,
    marginBottom: 3,
  },
  painBody: {
    fontSize: 8.5,
    lineHeight: 1.42,
    color: C.soft,
  },
  rootCause: {
    backgroundColor: "#0F2740",
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginBottom: 12,
  },
  rootCauseText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: C.ink,
  },
  twoCol: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 5,
    gap: 6,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
    marginTop: 4,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.42,
    color: C.soft,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 5,
    gap: 7,
  },
  stepNum: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#0C4A6E",
    color: C.accent,
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 2.5,
  },
  agentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  agentPill: {
    backgroundColor: C.bgAlt,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  agentPillText: {
    fontSize: 8,
    color: C.ink,
    fontWeight: 500,
  },
  diagramWrap: {
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: C.bg,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  // Full image, no crop — natural 3:2 aspect (1536x1024)
  diagram: {
    width: "100%",
  },
  heroCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 7,
    padding: 11,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0C4A6E",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.cardBorder,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: C.card,
  },
  th: {
    fontSize: 8,
    fontWeight: 700,
    color: C.warm,
  },
  td: {
    fontSize: 8,
    color: C.soft,
    lineHeight: 1.35,
  },
  closeBox: {
    marginTop: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.accentDim,
    borderRadius: 8,
    padding: 12,
  },
  closeText: {
    fontSize: 9.5,
    lineHeight: 1.52,
    color: C.ink,
  },
});

function Footer({ page, total }: { page: number; total: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>NexusIQ-AI  |  Confidential overview</Text>
      <Text style={styles.footerText}>
        {page} / {total}
      </Text>
    </View>
  );
}

function Header({ label }: { label: string }) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.brand}>NEXUSIQ-AI</Text>
      <Text style={styles.pageLabel}>{label}</Text>
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function Step({ n, children }: { n: string; children: string }) {
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepNum}>{n}</Text>
      <Text style={[styles.bulletText, { marginTop: 1 }]}>{children}</Text>
    </View>
  );
}

const PitchDoc = () => (
  <Document
    title="NexusIQ-AI - Problem & Solution Overview"
    author="NexusIQ-AI"
    subject="Enterprise Decision Intelligence Platform"
  >
    {/* PAGE 1 — Problem */}
    <Page size="LETTER" style={styles.page}>
      <Header label="PROBLEM STATEMENT" />
      <View style={styles.accentRule} />
      <Text style={styles.kicker}>ENTERPRISE DECISION INTELLIGENCE</Text>
      <Text style={styles.h1}>
        High-stakes decisions still take weeks - and miss what matters.
      </Text>
      <Text style={styles.lead}>
        M&A diligence, vendor evaluation, internal audit, compliance review,
        investment analysis, and board reporting still depend on manual,
        cross-team reading of enormous document sets. A typical data room holds
        thousands of pages. Recommendations reach executives only after days or
        weeks of duplicated effort - and critical contradictions still slip
        through.
      </Text>

      <Text style={styles.h2}>Four structural failures</Text>
      <View style={styles.painGrid}>
        <View style={styles.painCard}>
          <Text style={styles.painTitle}>Speed vs. risk</Text>
          <Text style={styles.painBody}>
            Rushing misses red flags; thoroughness delays decisions and can lose
            deals.
          </Text>
        </View>
        <View style={styles.painCard}>
          <Text style={styles.painTitle}>Duplication across silos</Text>
          <Text style={styles.painBody}>
            Legal, finance, and compliance re-read the same files with little
            shared state.
          </Text>
        </View>
        <View style={styles.painCard}>
          <Text style={styles.painTitle}>Fragmented signals</Text>
          <Text style={styles.painBody}>
            A buried clause can contradict a board-deck claim - with no single
            owner of the full picture.
          </Text>
        </View>
        <View style={styles.painCard}>
          <Text style={styles.painTitle}>Untrustworthy AI shortcuts</Text>
          <Text style={styles.painBody}>
            Generic chat tools lack a data-room workflow, mandatory citations,
            and auditable multi-perspective reasoning.
          </Text>
        </View>
      </View>

      <View style={styles.rootCause}>
        <Text style={styles.rootCauseText}>
          Root causes: duplicated effort, missed contradictions, slow decision
          cycles, and black-box AI that cannot show its evidence trail.
          Enterprises need weeks compressed into minutes - without shipping
          sensitive deal data to opaque third-party APIs, and without
          sacrificing auditability.
        </Text>
      </View>

      <Text style={styles.h2}>Who feels the pain</Text>
      <View style={styles.twoCol}>
        <View style={styles.col}>
          <Bullet>PE / IB analysts - deal data rooms under deadline</Bullet>
          <Bullet>Corp Dev - acquisition target analysis</Bullet>
          <Bullet>CFO / Finance - anomalies found too late</Bullet>
          <Bullet>Legal counsel - clause risk buried in PDFs</Bullet>
        </View>
        <View style={styles.col}>
          <Bullet>Compliance - manual framework mapping</Bullet>
          <Bullet>Auditors - slow evidence gathering</Bullet>
          <Bullet>Procurement - incomplete vendor picture</Bullet>
          <Bullet>Executives - analyst bottleneck before board prep</Bullet>
        </View>
      </View>
      <Footer page={1} total={3} />
    </Page>

    {/* PAGE 2 — Solution + full architecture diagram (uncropped) */}
    <Page size="LETTER" style={styles.page}>
      <Header label="SOLUTION ARCHITECTURE" />
      <View style={styles.accentRule} />
      <Text style={styles.kicker}>THE PLATFORM</Text>
      <Text style={styles.h1Compact}>
        NexusIQ-AI: diligence intelligence in minutes.
      </Text>
      <Text style={styles.body}>
        A local-first AI enterprise decision-intelligence platform. Upload an
        entire company data room; the system runs financial, legal, compliance,
        risk, and fraud analysis, surfaces contradictions and missing documents,
        produces executive reports, and supports cited Q&A and what-if
        simulation - on local infrastructure via Ollama, with zero paid AI API
        cost.
      </Text>

      <Text style={styles.h2}>How intelligence flows</Text>
      <View style={styles.diagramWrap}>
        <Image style={styles.diagram} src={DIAGRAM} />
      </View>

      <View style={styles.heroCard}>
        <Text style={[styles.bodyTight, { color: C.ink }]}>
          Differentiator: every factual claim is designed to carry citations to
          source chunks, a confidence signal, and - when agents disagree -
          visible dissent plus a resolution rationale. Consensus is never a
          black box.
        </Text>
      </View>
      <Footer page={2} total={3} />
    </Page>

    {/* PAGE 3 — Journey + AI method + industry value */}
    <Page size="LETTER" style={styles.page}>
      <Header label="AI METHOD  |  INDUSTRY VALUE" />
      <View style={styles.accentRule} />

      <Text style={styles.h2}>End-to-end journey</Text>
      <Step n="1">Create workspace and project (deal, audit, or vendor review).</Step>
      <Step n="2">Upload the data room - folders, bulk upload, OCR where needed.</Step>
      <Step n="3">Classify, extract, chunk, embed, and index for search.</Step>
      <Step n="4">Run specialist agents; consensus synthesizes an explainable recommendation.</Step>
      <Step n="5">Explore chat, reports, graph, gaps, simulator, and actions - then export.</Step>

      <Text style={[styles.kicker, { marginTop: 12 }]}>HOW AI SOLVES IT</Text>
      <Text style={styles.h2}>Retrieval-first, multi-agent, and explainable</Text>
      <Text style={styles.body}>
        NexusIQ-AI is not a single chatbot over PDFs. Documents are classified,
        extracted, chunked, and embedded locally. Agents and chat retrieve
        evidence first, then reason - reducing hallucination and making
        citations first-class.
      </Text>

      <Text
        style={[
          styles.bodyTight,
          { marginBottom: 4, color: C.muted, fontWeight: 600, letterSpacing: 1 },
        ]}
      >
        SPECIALIST AGENTS
      </Text>
      <View style={styles.agentGrid}>
        {[
          "Financial",
          "Legal",
          "Compliance",
          "Risk",
          "Fraud",
          "Executive",
          "Consensus",
        ].map((a) => (
          <View key={a} style={styles.agentPill}>
            <Text style={styles.agentPillText}>{a}</Text>
          </View>
        ))}
      </View>

      <View style={styles.twoCol}>
        <View style={styles.col}>
          <Bullet>
            Contradiction engine validates inconsistencies against retrieved
            source text on both sides.
          </Bullet>
          <Bullet>
            Missing-info engine maps uploads to project-type checklists and
            compliance gaps.
          </Bullet>
        </View>
        <View style={styles.col}>
          <Bullet>
            Risk simulator explores scenarios over completed financial and risk
            runs via grounded RAG.
          </Bullet>
          <Bullet>
            Local Ollama, PostgreSQL, and filesystem keep sensitive materials
            under operator control.
          </Bullet>
        </View>
      </View>

      <Text style={[styles.h2, { marginTop: 12 }]}>
        Why it matters in industry
      </Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: "28%" }]}>Buyer / role</Text>
        <Text style={[styles.th, { width: "72%" }]}>Value</Text>
      </View>
      {(
        [
          [
            "PE / IB / Corp Dev",
            "Compress data-room diligence; surface financial and contractual red flags earlier.",
          ],
          [
            "Legal",
            "Scan clause risk and liability patterns with source citations.",
          ],
          [
            "Compliance / Audit",
            "Gap analysis, evidence trails, contradiction and missing-document coverage.",
          ],
          [
            "CFO / Finance",
            "Anomalies, concentration, and health signals before the earnings or audit cycle.",
          ],
          [
            "Procurement",
            "Vendor risk and incomplete information before contract commitment.",
          ],
          [
            "Executives / Boards",
            "Cited memos and risk heatmaps without a multi-week analyst bottleneck.",
          ],
        ] as const
      ).map(([role, value], i) => (
        <View
          key={role}
          style={[
            styles.tableRow,
            i === 5
              ? { borderBottomLeftRadius: 5, borderBottomRightRadius: 5 }
              : {},
          ]}
        >
          <Text
            style={[
              styles.td,
              { width: "28%", fontWeight: 700, color: C.ink },
            ]}
          >
            {role}
          </Text>
          <Text style={[styles.td, { width: "72%" }]}>{value}</Text>
        </View>
      ))}

      <View style={styles.closeBox}>
        <Text style={styles.closeText}>
          NexusIQ-AI attacks the diligence bottleneck at its root: too many
          documents, too many silos, too little shared evidence. Retrieval-first
          local AI, specialist agents, and explainable consensus turn weeks of
          review into a minutes-scale intelligence session - faster decisions,
          fewer missed risks, and outputs organizations can actually defend.
        </Text>
      </View>
      <Footer page={3} total={3} />
    </Page>
  </Document>
);

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  await renderToFile(<PitchDoc />, OUT);
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
