-- DRAFT was never set by any code path (confirmed: 0 rows) and behaved
-- identically to PENDING_APPROVAL everywhere it was checked — same
-- create-new-type + USING remap + drop-old + rename pattern as the other
-- RequirementStatus/LeadStatus enum shrinks this session.
CREATE TYPE "RequirementStatus_new" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

ALTER TABLE "Requirement" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Requirement" ALTER COLUMN "status" TYPE "RequirementStatus_new" USING (
  CASE "status"::text
    WHEN 'DRAFT' THEN 'PENDING_APPROVAL'
    WHEN 'PENDING_APPROVAL' THEN 'PENDING_APPROVAL'
    WHEN 'APPROVED' THEN 'APPROVED'
    WHEN 'REJECTED' THEN 'REJECTED'
    ELSE 'PENDING_APPROVAL'
  END
)::"RequirementStatus_new";

ALTER TABLE "Requirement" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';

DROP TYPE "RequirementStatus";
ALTER TYPE "RequirementStatus_new" RENAME TO "RequirementStatus";
