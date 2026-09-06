-- QuotationShare: track when a decision was made (mirrors ProposalShare.respondedAt).
ALTER TABLE "QuotationShare" ADD COLUMN "respondedAt" TIMESTAMP(3);
UPDATE "QuotationShare" SET "respondedAt" = "acceptedAt" WHERE "status" = 'ACCEPTED' AND "acceptedAt" IS NOT NULL;
UPDATE "QuotationShare" SET "respondedAt" = "createdAt" WHERE "status" = 'REJECTED' AND "respondedAt" IS NULL;

-- QuotationVersion: add updatedAt (mirrors ProposalVersion.updatedAt).
ALTER TABLE "QuotationVersion" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "QuotationVersion" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "QuotationVersion" ALTER COLUMN "updatedAt" SET NOT NULL;

-- QuotationVersion: add discountPercent (the rep-entered rate); discountAmount
-- stays as the stored computed absolute value, now derived from this rate.
ALTER TABLE "QuotationVersion" ADD COLUMN "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
UPDATE "QuotationVersion" SET "discountPercent" = CASE
  WHEN subtotal > 0 THEN LEAST(100, GREATEST(0, ROUND(("discountAmount" / subtotal) * 100, 2)))
  ELSE 0
END;

-- QuotationItem: convert each line's absolute discountAmount into a percent
-- of (quantity * unitPrice), then drop the old column.
ALTER TABLE "QuotationItem" ADD COLUMN "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
UPDATE "QuotationItem" SET "discountPercent" = CASE
  WHEN (quantity * "unitPrice") > 0 THEN LEAST(100, GREATEST(0, ROUND(("discountAmount" / (quantity * "unitPrice")) * 100, 2)))
  ELSE 0
END;
ALTER TABLE "QuotationItem" DROP COLUMN "discountAmount";
