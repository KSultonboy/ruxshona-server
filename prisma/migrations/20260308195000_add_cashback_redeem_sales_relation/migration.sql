ALTER TABLE "Sale"
ADD COLUMN IF NOT EXISTS "cashbackRedeemTransactionId" TEXT;

CREATE INDEX IF NOT EXISTS "Sale_cashbackRedeemTransactionId_idx"
ON "Sale"("cashbackRedeemTransactionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Sale_cashbackRedeemTransactionId_fkey'
  ) THEN
    ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_cashbackRedeemTransactionId_fkey"
    FOREIGN KEY ("cashbackRedeemTransactionId")
    REFERENCES "CashbackTransaction"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
