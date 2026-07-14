-- AlterTable
ALTER TABLE "timeline_events" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "timeline_events" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "timeline_events_project_id_deleted_at_event_date_idx" ON "timeline_events"("project_id", "deleted_at", "event_date");
