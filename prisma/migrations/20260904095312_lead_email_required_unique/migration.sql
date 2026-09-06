-- Lead.email becomes required and unique per workspace. Existing leads with
-- no email (there is no ambiguity here — a prior check confirmed zero
-- duplicate (workspaceId, email) pairs among leads that already have one)
-- are backfilled with a deterministic, guaranteed-unique placeholder so the
-- NOT NULL + unique constraints can be added without any data loss or
-- manual conflict resolution.

UPDATE "Lead"
SET "email" = 'lead-' || "id" || '@no-email.local'
WHERE "email" IS NULL;

ALTER TABLE "Lead" ALTER COLUMN "email" SET NOT NULL;

CREATE UNIQUE INDEX "Lead_workspaceId_email_key" ON "Lead"("workspaceId", "email");
