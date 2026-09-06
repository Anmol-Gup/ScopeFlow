-- Project-centric restructure: Requirement/RequirementVersion/Proposal/
-- Quotation/OriginalInquiry move from Lead-owned (leadId) to Project-owned
-- (projectId), and Project stops being 1:1 with Lead. Every existing row
-- must end up with a real Project, so this backfills in three passes:
-- add projectId nullable -> auto-create a "legacy" Project for any Lead
-- that has data but no Project yet -> point every row at its Lead's
-- Project -> only then enforce NOT NULL and drop the old leadId columns.

-- 'SCOPING' was already added to ProjectStatus in the prior migration
-- (had to be committed in its own transaction before use here).

-- Project stops being strictly 1:1 with Lead.
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_leadId_key";
DROP INDEX IF EXISTS "Project_leadId_key";

-- Add the new ownership column, nullable for now so we can backfill it.
ALTER TABLE "OriginalInquiry" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Requirement" ADD COLUMN "projectId" TEXT;
ALTER TABLE "RequirementVersion" ADD COLUMN "projectId" TEXT;

-- Additive only — meeting-transcript analyses keep using leadId and never
-- get a projectId; only the pasted-client-info path sets this going forward.
ALTER TABLE "MeetingAnalysis" ADD COLUMN "projectId" TEXT;

-- Every Lead that already reached WON has exactly one Project today (the
-- old 1:1 model) — but any Lead still short of WON can have Requirements/
-- Proposals/Quotations/OriginalInquiries with no Project at all yet. Give
-- each such Lead one "legacy" Project so nothing is left orphaned.
INSERT INTO "Project" ("id", "workspaceId", "leadId", "name", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  l."workspaceId",
  l."id",
  COALESCE(l."company", l."name"),
  CASE WHEN l."status" = 'WON' THEN 'ACTIVE' ELSE 'SCOPING' END::"ProjectStatus",
  now(),
  now()
FROM "Lead" l
WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."leadId" = l."id")
  AND (
    EXISTS (SELECT 1 FROM "OriginalInquiry" oi WHERE oi."leadId" = l."id")
    OR EXISTS (SELECT 1 FROM "Proposal" pr WHERE pr."leadId" = l."id")
    OR EXISTS (SELECT 1 FROM "Quotation" q WHERE q."leadId" = l."id")
    OR EXISTS (SELECT 1 FROM "Requirement" r WHERE r."leadId" = l."id")
    OR EXISTS (SELECT 1 FROM "RequirementVersion" rv WHERE rv."leadId" = l."id")
  );

-- Point every existing row at its lead's (now guaranteed-to-exist) Project.
UPDATE "OriginalInquiry" oi
SET "projectId" = p."id"
FROM "Project" p
WHERE p."leadId" = oi."leadId";

UPDATE "Proposal" pr
SET "projectId" = p."id"
FROM "Project" p
WHERE p."leadId" = pr."leadId";

UPDATE "Quotation" q
SET "projectId" = p."id"
FROM "Project" p
WHERE p."leadId" = q."leadId";

UPDATE "Requirement" r
SET "projectId" = p."id"
FROM "Project" p
WHERE p."leadId" = r."leadId";

UPDATE "RequirementVersion" rv
SET "projectId" = p."id"
FROM "Project" p
WHERE p."leadId" = rv."leadId";

-- Every row now has a projectId — enforce it.
ALTER TABLE "OriginalInquiry" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "Proposal" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "Quotation" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "Requirement" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "RequirementVersion" ALTER COLUMN "projectId" SET NOT NULL;

-- Drop the old leadId ownership (FK, index, column) now that projectId
-- fully replaces it on these five tables.
ALTER TABLE "OriginalInquiry" DROP CONSTRAINT "OriginalInquiry_leadId_fkey";
DROP INDEX "OriginalInquiry_leadId_idx";
ALTER TABLE "OriginalInquiry" DROP COLUMN "leadId";

ALTER TABLE "Proposal" DROP CONSTRAINT "Proposal_leadId_fkey";
DROP INDEX "Proposal_leadId_idx";
ALTER TABLE "Proposal" DROP COLUMN "leadId";

ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_leadId_fkey";
DROP INDEX "Quotation_leadId_idx";
ALTER TABLE "Quotation" DROP COLUMN "leadId";

ALTER TABLE "Requirement" DROP CONSTRAINT "Requirement_leadId_fkey";
DROP INDEX "Requirement_leadId_idx";
ALTER TABLE "Requirement" DROP COLUMN "leadId";

ALTER TABLE "RequirementVersion" DROP CONSTRAINT "RequirementVersion_leadId_fkey";
DROP INDEX "RequirementVersion_leadId_version_key";
ALTER TABLE "RequirementVersion" DROP COLUMN "leadId";

-- New indexes / FKs for the projectId columns.
CREATE INDEX "MeetingAnalysis_projectId_idx" ON "MeetingAnalysis"("projectId");
ALTER TABLE "MeetingAnalysis" ADD CONSTRAINT "MeetingAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "OriginalInquiry_projectId_idx" ON "OriginalInquiry"("projectId");
ALTER TABLE "OriginalInquiry" ADD CONSTRAINT "OriginalInquiry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Requirement_projectId_idx" ON "Requirement"("projectId");
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "RequirementVersion_projectId_version_key" ON "RequirementVersion"("projectId", "version");
ALTER TABLE "RequirementVersion" ADD CONSTRAINT "RequirementVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Proposal_projectId_idx" ON "Proposal"("projectId");
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Quotation_projectId_idx" ON "Quotation"("projectId");
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Project_leadId_idx" ON "Project"("leadId");

-- New Project.status default for rows created from here on.
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'SCOPING';

-- New tables: ProposalChangeRequest (durable, queryable record of a
-- client's "Request Changes" on a proposal) and QuotationShare (public
-- accept/reject link for quotations, mirroring ProposalShare).
CREATE TABLE "ProposalChangeRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "proposalVersionId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuotationShare" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByName" TEXT,
    "acceptedByEmail" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationShare_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProposalChangeRequest_projectId_idx" ON "ProposalChangeRequest"("projectId");
CREATE INDEX "ProposalChangeRequest_proposalId_idx" ON "ProposalChangeRequest"("proposalId");
ALTER TABLE "ProposalChangeRequest" ADD CONSTRAINT "ProposalChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProposalChangeRequest" ADD CONSTRAINT "ProposalChangeRequest_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProposalChangeRequest" ADD CONSTRAINT "ProposalChangeRequest_proposalVersionId_fkey" FOREIGN KEY ("proposalVersionId") REFERENCES "ProposalVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "QuotationShare_token_key" ON "QuotationShare"("token");
CREATE INDEX "QuotationShare_quotationId_idx" ON "QuotationShare"("quotationId");
ALTER TABLE "QuotationShare" ADD CONSTRAINT "QuotationShare_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
