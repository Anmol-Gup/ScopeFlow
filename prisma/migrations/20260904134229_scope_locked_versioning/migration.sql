-- Scope-locked Proposal/Quotation versioning: every ProposalVersion and
-- QuotationVersion now records exactly which approved-requirement snapshot
-- it was generated from, and Proposal/Quotation gain a `kind` distinguishing
-- the project's original scope from later additional-scope documents.

-- ---------------------------------------------------------------------------
-- 1. Placeholder RequirementVersion for any project whose existing Proposal/
--    Quotation versions predate requirement-approval history entirely (test
--    data created before that gate existed). Non-destructive best-effort
--    backfill target — never used for new documents going forward.
-- ---------------------------------------------------------------------------
INSERT INTO "RequirementVersion" (id, "projectId", version, "changesSummary", snapshot, "createdAt")
SELECT
  'legacy_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
  orphaned."projectId",
  1,
  'Backfilled placeholder — no requirement-approval history existed before this migration.',
  '[]'::jsonb,
  now()
FROM (
  SELECT DISTINCT p."projectId"
  FROM "ProposalVersion" pv
  JOIN "Proposal" p ON p.id = pv."proposalId"
  WHERE NOT EXISTS (SELECT 1 FROM "RequirementVersion" rv WHERE rv."projectId" = p."projectId")
  UNION
  SELECT DISTINCT q."projectId"
  FROM "QuotationVersion" qv
  JOIN "Quotation" q ON q.id = qv."quotationId"
  WHERE NOT EXISTS (SELECT 1 FROM "RequirementVersion" rv WHERE rv."projectId" = q."projectId")
) orphaned
WHERE NOT EXISTS (SELECT 1 FROM "RequirementVersion" rv2 WHERE rv2."projectId" = orphaned."projectId");

-- ---------------------------------------------------------------------------
-- 2. DocumentKind — new enum, safe to create and use in the same
--    transaction (only ADD VALUE on an existing enum needs isolation).
-- ---------------------------------------------------------------------------
CREATE TYPE "DocumentKind" AS ENUM ('ORIGINAL', 'ADDITIONAL');

ALTER TABLE "Proposal" ADD COLUMN "kind" "DocumentKind" NOT NULL DEFAULT 'ORIGINAL';
ALTER TABLE "Quotation" ADD COLUMN "kind" "DocumentKind" NOT NULL DEFAULT 'ORIGINAL';

-- ---------------------------------------------------------------------------
-- 3. RequirementStatus remap: CONFIRMED/NEEDS_CONFIRMATION/ASSUMPTION/
--    REJECTED -> DRAFT/PENDING_APPROVAL/APPROVED/REJECTED. Same
--    create-new-type + USING remap + drop-old + rename pattern already used
--    for the LeadStatus shrink this session.
-- ---------------------------------------------------------------------------
CREATE TYPE "RequirementStatus_new" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

ALTER TABLE "Requirement" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Requirement" ALTER COLUMN "status" TYPE "RequirementStatus_new" USING (
  CASE "status"::text
    WHEN 'CONFIRMED' THEN 'APPROVED'
    WHEN 'NEEDS_CONFIRMATION' THEN 'PENDING_APPROVAL'
    WHEN 'ASSUMPTION' THEN 'PENDING_APPROVAL'
    WHEN 'REJECTED' THEN 'REJECTED'
    ELSE 'PENDING_APPROVAL'
  END
)::"RequirementStatus_new";

ALTER TABLE "Requirement" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';

DROP TYPE "RequirementStatus";
ALTER TYPE "RequirementStatus_new" RENAME TO "RequirementStatus";

-- ---------------------------------------------------------------------------
-- 4. ProposalVersion.requirementVersionId — add nullable, backfill to the
--    project's oldest RequirementVersion (best-effort; the column is
--    accurate for every version created from here on, which is what
--    matters), then make required.
-- ---------------------------------------------------------------------------
ALTER TABLE "ProposalVersion" ADD COLUMN "requirementVersionId" TEXT;

UPDATE "ProposalVersion" pv
SET "requirementVersionId" = (
  SELECT rv.id FROM "RequirementVersion" rv
  JOIN "Proposal" p ON p.id = pv."proposalId"
  WHERE rv."projectId" = p."projectId"
  ORDER BY rv."version" ASC
  LIMIT 1
)
WHERE pv."requirementVersionId" IS NULL;

ALTER TABLE "ProposalVersion" ALTER COLUMN "requirementVersionId" SET NOT NULL;

ALTER TABLE "ProposalVersion"
  ADD CONSTRAINT "ProposalVersion_requirementVersionId_fkey"
  FOREIGN KEY ("requirementVersionId") REFERENCES "RequirementVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ProposalVersion_requirementVersionId_idx" ON "ProposalVersion"("requirementVersionId");

-- ---------------------------------------------------------------------------
-- 5. QuotationVersion.requirementVersionId — same pattern.
-- ---------------------------------------------------------------------------
ALTER TABLE "QuotationVersion" ADD COLUMN "requirementVersionId" TEXT;

UPDATE "QuotationVersion" qv
SET "requirementVersionId" = (
  SELECT rv.id FROM "RequirementVersion" rv
  JOIN "Quotation" q ON q.id = qv."quotationId"
  WHERE rv."projectId" = q."projectId"
  ORDER BY rv."version" ASC
  LIMIT 1
)
WHERE qv."requirementVersionId" IS NULL;

ALTER TABLE "QuotationVersion" ALTER COLUMN "requirementVersionId" SET NOT NULL;

ALTER TABLE "QuotationVersion"
  ADD CONSTRAINT "QuotationVersion_requirementVersionId_fkey"
  FOREIGN KEY ("requirementVersionId") REFERENCES "RequirementVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "QuotationVersion_requirementVersionId_idx" ON "QuotationVersion"("requirementVersionId");
