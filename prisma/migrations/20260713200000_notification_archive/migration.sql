-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "archived_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "notifications_user_id_archived_at_idx" ON "notifications"("user_id", "archived_at");
