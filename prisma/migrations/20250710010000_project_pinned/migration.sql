-- AlterTable
ALTER TABLE "projects" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "projects_pinned_updated_at_idx" ON "projects"("pinned", "updated_at");
