-- Remove the entire meeting-logging/analysis and client-self-scheduling
-- ("booking link") feature set, per explicit user request. Drops real data
-- (any logged meetings, their AI analyses/attachments, and booking
-- availability/links) — this workspace's test data only, not recoverable.

-- 1. Requirement.sourceAnalysisId must be dropped before MeetingAnalysis,
--    since it's the FK target.
ALTER TABLE "Requirement" DROP CONSTRAINT IF EXISTS "Requirement_sourceAnalysisId_fkey";
DROP INDEX IF EXISTS "Requirement_sourceAnalysisId_idx";
ALTER TABLE "Requirement" DROP COLUMN IF EXISTS "sourceAnalysisId";

-- 2. Drop tables in dependency order (children before parents).
DROP TABLE IF EXISTS "MeetingAttachment";
DROP TABLE IF EXISTS "MeetingAnalysis";
DROP TABLE IF EXISTS "MeetingBookingLink";
DROP TABLE IF EXISTS "MeetingAvailability";
DROP TABLE IF EXISTS "Meeting";

-- 3. Drop the now-unused enums.
DROP TYPE IF EXISTS "MeetingStatus";
DROP TYPE IF EXISTS "MeetingSource";

-- 4. AIOperation enum shrink: drop historical usage rows for the removed
--    operation (no longer a meaningful category to keep around), then the
--    standard create-new-type/remap/drop-old/rename pattern.
DELETE FROM "AIUsage" WHERE "operation" = 'ANALYZE_MEETING';

CREATE TYPE "AIOperation_new" AS ENUM ('GENERATE_PROPOSAL', 'GENERATE_FOLLOWUP', 'SUGGEST_NEGOTIATION', 'PARAPHRASE_REQUIREMENT');
ALTER TABLE "AIUsage" ALTER COLUMN "operation" TYPE "AIOperation_new" USING ("operation"::text::"AIOperation_new");
DROP TYPE "AIOperation";
ALTER TYPE "AIOperation_new" RENAME TO "AIOperation";
