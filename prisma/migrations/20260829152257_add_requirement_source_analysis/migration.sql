-- AlterTable
ALTER TABLE "Requirement" ADD COLUMN     "sourceAnalysisId" TEXT;

-- CreateIndex
CREATE INDEX "Requirement_sourceAnalysisId_idx" ON "Requirement"("sourceAnalysisId");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_sourceAnalysisId_fkey" FOREIGN KEY ("sourceAnalysisId") REFERENCES "MeetingAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
