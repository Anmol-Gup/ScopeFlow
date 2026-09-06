-- CreateEnum
CREATE TYPE "MeetingSource" AS ENUM ('AGENCY_ADDED', 'CLIENT_BOOKED');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "source" "MeetingSource" NOT NULL DEFAULT 'AGENCY_ADDED';

-- CreateTable
CREATE TABLE "MeetingAvailability" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "meetingDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 4,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30,
    "weeklyHours" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingBookingLink" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingBookingLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAvailability_workspaceId_key" ON "MeetingAvailability"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingBookingLink_leadId_key" ON "MeetingBookingLink"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingBookingLink_token_key" ON "MeetingBookingLink"("token");

-- AddForeignKey
ALTER TABLE "MeetingAvailability" ADD CONSTRAINT "MeetingAvailability_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingBookingLink" ADD CONSTRAINT "MeetingBookingLink_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
