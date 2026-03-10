ALTER TABLE "Expense"
ADD COLUMN "batchId" TEXT;

CREATE INDEX "Expense_batchId_idx" ON "Expense"("batchId");
