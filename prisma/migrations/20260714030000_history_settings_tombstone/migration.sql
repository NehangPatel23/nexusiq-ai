-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'UPLOAD',
  'PROCESS',
  'SEARCH',
  'CHAT',
  'REPORT',
  'AGENT_RUN',
  'CONSENSUS',
  'SIMULATION',
  'USER_DELETED',
  'USER_RECOVERED',
  'USER_PURGED',
  'ORG_DELETED',
  'ORG_RECOVERED',
  'ORG_PURGED',
  'SETTINGS_UPDATE'
);

-- AlterTable users
ALTER TABLE "users" ADD COLUMN "notification_prefs" JSONB;
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "purge_after" TIMESTAMP(3);

CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");
CREATE INDEX "users_purge_after_idx" ON "users"("purge_after");

-- AlterTable organizations
ALTER TABLE "organizations" ADD COLUMN "purge_after" TIMESTAMP(3);

CREATE INDEX "organizations_purge_after_idx" ON "organizations"("purge_after");

-- CreateTable audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");
CREATE INDEX "audit_logs_organization_id_action_idx" ON "audit_logs"("organization_id", "action");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable system_settings
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
