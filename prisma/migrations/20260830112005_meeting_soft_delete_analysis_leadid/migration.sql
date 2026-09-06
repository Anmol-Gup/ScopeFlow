-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable: add leadId nullable first, backfill from the analysis's
-- meeting, then enforce NOT NULL (every existing row today is
-- meeting-scoped, so this is always derivable).
ALTER TABLE "MeetingAnalysis" ADD COLUMN     "leadId" TEXT,
ALTER COLUMN "meetingId" DROP NOT NULL;

UPDATE "MeetingAnalysis"
SET "leadId" = "Meeting"."leadId"
FROM "Meeting"
WHERE "Meeting"."id" = "MeetingAnalysis"."meetingId";

ALTER TABLE "MeetingAnalysis" ALTER COLUMN "leadId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "MeetingAnalysis" ADD CONSTRAINT "MeetingAnalysis_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
