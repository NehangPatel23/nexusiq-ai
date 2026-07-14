import { prisma } from "../src/lib/db";
import { findValueMatch } from "../features/contradictions/lib/excerpt-match";

/**
 * Seeds OPEN Contradiction rows that cite real values present in the demo data room.
 * Chunk IDs are resolved by searching document text for the stated values.
 */
async function findChunkContaining(documentId: string, value: string, factType: string) {
  const chunks = await prisma.documentChunk.findMany({
    where: { documentId },
    select: { id: true, content: true, chunkIndex: true },
    orderBy: { chunkIndex: "asc" },
  });
  const hit = chunks.find((chunk) => findValueMatch(chunk.content, value, factType));
  return hit?.id ?? chunks[0]?.id ?? null;
}

async function main() {
  const project = await prisma.project.findFirst({
    where: {
      deletedAt: null,
      documents: { some: { deletedAt: null, status: "READY", chunks: { some: {} } } },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      documents: {
        where: { deletedAt: null, status: "READY" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!project || project.documents.length < 2) {
    throw new Error("Need a project with at least 2 READY documents that have chunks.");
  }

  const byName = (needle: string) =>
    project.documents.find((d) => d.name.toLowerCase().includes(needle.toLowerCase()));

  const investor = byName("Investor-Update") ?? project.documents[0]!;
  const mda = byName("Management-Discussion") ?? project.documents[1]!;
  const churn = byName("Customer-Churn") ?? mda;
  const contracts = byName("Material-Contracts") ?? project.documents[1]!;
  const awsNote = byName("Management-Discussion") ?? mda;

  async function pair(params: {
    docA: { id: string; name: string };
    docB: { id: string; name: string };
    valueA: string;
    valueB: string;
    factType: string;
  }) {
    const chunkAId = await findChunkContaining(params.docA.id, params.valueA, params.factType);
    const chunkBId = await findChunkContaining(params.docB.id, params.valueB, params.factType);
    if (!chunkAId || !chunkBId) {
      throw new Error(`Missing chunks for ${params.docA.name} / ${params.docB.name}`);
    }
    return {
      documentAId: params.docA.id,
      chunkAId,
      documentBId: params.docB.id,
      chunkBId,
    };
  }

  const samples = [
    {
      subject: "ARR year-over-year growth",
      factType: "METRIC" as const,
      valueA: "24%",
      valueB: "18.4%",
      explanation:
        "Investor update cites +24% YoY ARR growth while the audited management discussion reports 18.4% year-over-year growth for the same FY2023 period.",
      severity: "CRITICAL" as const,
      ...(await pair({
        docA: investor,
        docB: mda,
        valueA: "24%",
        valueB: "18.4%",
        factType: "METRIC",
      })),
    },
    {
      subject: "Net revenue retention (NRR)",
      factType: "METRIC" as const,
      valueA: "118%",
      valueB: "112%",
      explanation:
        "Investor materials claim 118% NRR; management discussion and churn analysis report 112% NRR for FY2023.",
      severity: "HIGH" as const,
      ...(await pair({
        docA: investor,
        docB: churn,
        valueA: "118%",
        valueB: "112%",
        factType: "METRIC",
      })),
    },
    {
      subject: "Cash runway",
      factType: "METRIC" as const,
      valueA: "30+ months",
      valueB: "24 months",
      explanation:
        "Investor update headlines 30+ months of cash runway while the management discussion states runway exceeds 24 months at current burn.",
      severity: "MEDIUM" as const,
      ...(await pair({
        docA: investor,
        docB: mda,
        valueA: "30+ months",
        valueB: "24 months",
        factType: "METRIC",
      })),
    },
    {
      subject: "AWS renewal price-increase cap",
      factType: "AMOUNT" as const,
      valueA: "40%",
      valueB: "22%",
      explanation:
        "Material contracts summary says AWS may increase unit pricing up to 40% upon renewal; management discussion cites AWS infrastructure costs rose 22% YoY with renegotiation underway.",
      severity: "LOW" as const,
      ...(await pair({
        docA: contracts,
        docB: awsNote,
        valueA: "40%",
        valueB: "22%",
        factType: "AMOUNT",
      })),
    },
  ];

  await prisma.contradiction.deleteMany({
    where: {
      projectId: project.id,
      OR: [
        { subject: { in: samples.map((s) => s.subject) } },
        // Clear older fabricated demo subjects from prior seed runs.
        {
          subject: {
            in: [
              "FY2023 ARR",
              "MSA renewal / auto-renew date",
              "Related-party vendor name",
              "Gross margin",
            ],
          },
        },
      ],
    },
  });

  for (const sample of samples) {
    await prisma.contradiction.create({
      data: {
        projectId: project.id,
        status: "OPEN",
        ...sample,
      },
    });
  }

  console.log(
    `Seeded ${samples.length} contradictions on "${project.name}" (${project.id}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
