-- Backfill older open findings so only the latest completed run per project/agent remains current.
WITH latest_completed_runs AS (
  SELECT DISTINCT ON ("project_id", "agent_type")
    "id",
    "project_id",
    "agent_type"
  FROM "agent_runs"
  WHERE "status" = 'COMPLETED'
  ORDER BY "project_id", "agent_type", "completed_at" DESC NULLS LAST, "started_at" DESC
)
UPDATE "findings" AS f
SET "status" = 'SUPERSEDED'
WHERE f."status" IN ('OPEN', 'ACKNOWLEDGED')
  AND EXISTS (
    SELECT 1
    FROM latest_completed_runs AS l
    WHERE l."project_id" = f."project_id"
      AND l."agent_type" = f."agent_type"
      AND l."id" <> f."agent_run_id"
  );
