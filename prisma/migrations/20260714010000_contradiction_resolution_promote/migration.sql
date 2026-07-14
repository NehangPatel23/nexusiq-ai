-- AlterTable
ALTER TABLE "contradictions" ADD COLUMN IF NOT EXISTS "resolution_note" TEXT;
ALTER TABLE "contradictions" ADD COLUMN IF NOT EXISTS "status_changed_by_id" TEXT;
ALTER TABLE "contradictions" ADD COLUMN IF NOT EXISTS "status_changed_at" TIMESTAMP(3);
ALTER TABLE "contradictions" ADD COLUMN IF NOT EXISTS "promoted_finding_id" TEXT;
