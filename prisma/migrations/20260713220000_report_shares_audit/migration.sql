-- AlterEnum
ALTER TYPE "DataRoomAuditAction" ADD VALUE IF NOT EXISTS 'REPORT_GENERATED';
ALTER TYPE "DataRoomAuditAction" ADD VALUE IF NOT EXISTS 'REPORT_EXPORTED';
ALTER TYPE "DataRoomAuditAction" ADD VALUE IF NOT EXISTS 'REPORT_SHARE_CREATED';
ALTER TYPE "DataRoomAuditAction" ADD VALUE IF NOT EXISTS 'REPORT_SHARE_REVOKED';

-- AlterEnum
ALTER TYPE "DataRoomResourceType" ADD VALUE IF NOT EXISTS 'REPORT';

-- CreateTable
CREATE TABLE "report_shares" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "format" "ReportFormat",
    "expires_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "report_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_shares_token_key" ON "report_shares"("token");

-- CreateIndex
CREATE INDEX "report_shares_report_id_idx" ON "report_shares"("report_id");

-- CreateIndex
CREATE INDEX "report_shares_project_id_idx" ON "report_shares"("project_id");

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
