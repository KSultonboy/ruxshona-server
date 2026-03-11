ALTER TABLE "Sale"
ADD COLUMN "saleGroupId" VARCHAR(64);

CREATE INDEX "Sale_saleGroupId_idx" ON "Sale"("saleGroupId");
