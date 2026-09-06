-- Shrink LeadStatus to a minimal relationship-stage enum (NEW, CONTACTED,
-- ACTIVE, WON, LOST). Now that a Project owns Requirements/Proposal/
-- Quotation progress, the Lead itself only needs to track "who is the
-- client" — the fine-grained discovery/proposal/negotiation stages that
-- used to live on the Lead are removed. Existing leads in any of those
-- removed statuses are remapped to ACTIVE (they're all "in progress, not
-- yet won or lost").
--
-- Postgres can't drop enum values in place, so this recreates the type:
-- create the new enum, migrate the column across with a USING remap, drop
-- the old enum, then rename the new one into its place.

CREATE TYPE "LeadStatus_new" AS ENUM ('NEW', 'CONTACTED', 'ACTIVE', 'WON', 'LOST');

ALTER TABLE "Lead" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Lead" ALTER COLUMN "status" TYPE "LeadStatus_new" USING (
  CASE "status"::text
    WHEN 'DISCOVERY_SCHEDULED' THEN 'ACTIVE'
    WHEN 'DISCOVERY_COMPLETED' THEN 'ACTIVE'
    WHEN 'REQUIREMENTS_REVIEW' THEN 'ACTIVE'
    WHEN 'PROPOSAL_DRAFT' THEN 'ACTIVE'
    WHEN 'PROPOSAL_SENT' THEN 'ACTIVE'
    WHEN 'NEGOTIATION' THEN 'ACTIVE'
    ELSE "status"::text
  END
)::"LeadStatus_new";

ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'NEW';

DROP TYPE "LeadStatus";

ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
