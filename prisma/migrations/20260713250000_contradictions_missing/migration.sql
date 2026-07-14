-- CreateEnum
CREATE TYPE "ContradictionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ContradictionFactType" AS ENUM ('DATE', 'AMOUNT', 'PARTY', 'METRIC', 'OTHER');

-- CreateEnum
CREATE TYPE "MissingItemStatus" AS ENUM ('OPEN', 'REQUESTED', 'RESOLVED', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "contradictions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "fact_type" "ContradictionFactType" NOT NULL,
    "value_a" TEXT NOT NULL,
    "value_b" TEXT NOT NULL,
    "document_a_id" TEXT NOT NULL,
    "chunk_a_id" TEXT NOT NULL,
    "document_b_id" TEXT NOT NULL,
    "chunk_b_id" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "status" "ContradictionStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contradictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missing_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expected_type" TEXT,
    "framework" TEXT,
    "follow_up_text" TEXT,
    "severity" "FindingSeverity",
    "status" "MissingItemStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missing_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contradictions_project_id_status_severity_idx" ON "contradictions"("project_id", "status", "severity");

-- CreateIndex
CREATE INDEX "contradictions_project_id_created_at_idx" ON "contradictions"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "contradictions_chunk_a_id_idx" ON "contradictions"("chunk_a_id");

-- CreateIndex
CREATE INDEX "contradictions_chunk_b_id_idx" ON "contradictions"("chunk_b_id");

-- CreateIndex
CREATE INDEX "missing_items_project_id_status_idx" ON "missing_items"("project_id", "status");

-- AddForeignKey
ALTER TABLE "contradictions" ADD CONSTRAINT "contradictions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contradictions" ADD CONSTRAINT "contradictions_document_a_id_fkey" FOREIGN KEY ("document_a_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contradictions" ADD CONSTRAINT "contradictions_document_b_id_fkey" FOREIGN KEY ("document_b_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missing_items" ADD CONSTRAINT "missing_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
