CREATE TYPE "AgentType" AS ENUM ('FINANCIAL', 'LEGAL', 'COMPLIANCE', 'RISK', 'FRAUD');
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "agent_type" "AgentType" NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "input_params" JSONB,
    "output" JSONB,
    "score" DOUBLE PRECISION,
    "confidence" "ConfidenceLevel",
    "citations" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "triggered_by_id" TEXT,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "agent_type" "AgentType" NOT NULL,
    "agent_run_id" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "FindingSeverity",
    "score" DOUBLE PRECISION,
    "source_chunk_id" TEXT,
    "document_id" TEXT,
    "metadata" JSONB,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agent_runs_project_id_agent_type_started_at_idx"
ON "agent_runs"("project_id", "agent_type", "started_at");

CREATE INDEX "findings_project_id_agent_type_idx"
ON "findings"("project_id", "agent_type");

CREATE INDEX "findings_agent_run_id_idx"
ON "findings"("agent_run_id");

ALTER TABLE "agent_runs"
ADD CONSTRAINT "agent_runs_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_runs"
ADD CONSTRAINT "agent_runs_triggered_by_id_fkey"
FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "findings"
ADD CONSTRAINT "findings_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "findings"
ADD CONSTRAINT "findings_agent_run_id_fkey"
FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
