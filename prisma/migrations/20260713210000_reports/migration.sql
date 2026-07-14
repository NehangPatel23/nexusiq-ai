-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('EXECUTIVE', 'BOARD', 'INVESTMENT_MEMO', 'AUDIT', 'RISK_REGISTER', 'ACTION_PLAN', 'PPTX');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('MARKDOWN', 'PDF', 'XLSX', 'PPTX');

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "content" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'MARKDOWN',
    "file_path" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_project_id_created_at_idx" ON "reports"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
