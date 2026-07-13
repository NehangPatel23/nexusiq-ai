-- AlterEnum
ALTER TYPE "AgentType" ADD VALUE 'EXECUTIVE';

-- CreateTable
CREATE TABLE "consensus_runs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "agent_run_ids" TEXT[],
    "final_recommendation" TEXT NOT NULL,
    "decision_confidence" "ConfidenceLevel" NOT NULL,
    "agreements" JSONB NOT NULL,
    "conflicts" JSONB NOT NULL,
    "resolution_rationale" TEXT NOT NULL,
    "agent_opinions" JSONB NOT NULL,
    "citations" JSONB,
    "triggered_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consensus_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consensus_runs_project_id_created_at_idx" ON "consensus_runs"("project_id", "created_at");

-- AddForeignKey
ALTER TABLE "consensus_runs" ADD CONSTRAINT "consensus_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus_runs" ADD CONSTRAINT "consensus_runs_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
