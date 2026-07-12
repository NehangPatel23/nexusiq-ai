-- Saved searches for project-scoped smart search
CREATE TYPE "SearchMode" AS ENUM ('HYBRID', 'SEMANTIC', 'KEYWORD');

CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "mode" "SearchMode" NOT NULL DEFAULT 'HYBRID',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_searches_project_id_idx" ON "saved_searches"("project_id");
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");

ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
