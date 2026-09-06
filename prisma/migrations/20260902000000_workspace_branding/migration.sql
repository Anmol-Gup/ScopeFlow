-- Workspace branding: company profile shown on generated proposals/quotations,
-- plus optional per-document accent-color/terms overrides. Purely additive —
-- every new column is nullable and WorkspaceBranding is a new table, so no
-- backfill is needed.

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "accentColor" TEXT,
ADD COLUMN     "termsAndConditions" TEXT;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "accentColor" TEXT,
ADD COLUMN     "termsAndConditions" TEXT;

-- CreateTable
CREATE TABLE "WorkspaceBranding" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "companyName" TEXT,
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "companyWebsite" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "accentColor" TEXT,
    "paymentTerms" TEXT,
    "termsAndConditions" TEXT,
    "logoFilename" TEXT,
    "logoMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceBranding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceBranding_workspaceId_key" ON "WorkspaceBranding"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceBranding" ADD CONSTRAINT "WorkspaceBranding_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
