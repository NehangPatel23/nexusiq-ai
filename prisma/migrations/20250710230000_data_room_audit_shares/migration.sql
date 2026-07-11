-- Data room audit log and shareable links

CREATE TYPE "DataRoomAuditAction" AS ENUM (
  'UPLOADED',
  'SOFT_DELETED',
  'RESTORED',
  'PERMANENTLY_DELETED',
  'REPROCESSED',
  'RENAMED',
  'MOVED',
  'SHARE_CREATED',
  'SHARE_REVOKED'
);

CREATE TYPE "DataRoomResourceType" AS ENUM ('DOCUMENT', 'FOLDER');

CREATE TABLE "data_room_audit_events" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "actor_id" TEXT,
  "action" "DataRoomAuditAction" NOT NULL,
  "resource_type" "DataRoomResourceType" NOT NULL,
  "resource_id" TEXT NOT NULL,
  "resource_name" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "data_room_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_room_shares" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "label" TEXT,
  "expires_at" TIMESTAMP(3),
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),

  CONSTRAINT "data_room_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "data_room_shares_token_key" ON "data_room_shares"("token");
CREATE INDEX "data_room_audit_events_project_id_created_at_idx" ON "data_room_audit_events"("project_id", "created_at");
CREATE INDEX "data_room_shares_project_id_idx" ON "data_room_shares"("project_id");

ALTER TABLE "data_room_audit_events" ADD CONSTRAINT "data_room_audit_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_room_audit_events" ADD CONSTRAINT "data_room_audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "data_room_shares" ADD CONSTRAINT "data_room_shares_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_room_shares" ADD CONSTRAINT "data_room_shares_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
