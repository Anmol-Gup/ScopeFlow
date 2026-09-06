ALTER TABLE "ProposalVersion" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "ProposalVersion" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "ProposalVersion" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "ProposalShare" ADD COLUMN "respondedAt" TIMESTAMP(3);
UPDATE "ProposalShare" SET "respondedAt" = "acceptedAt" WHERE "status" = 'ACCEPTED' AND "acceptedAt" IS NOT NULL;
UPDATE "ProposalShare" SET "respondedAt" = "createdAt" WHERE "status" = 'REJECTED' AND "respondedAt" IS NULL;
