ALTER TABLE "public"."StockMovement"
  ALTER COLUMN "quantity" TYPE DOUBLE PRECISION
  USING "quantity"::double precision;

ALTER TABLE "public"."StockMovement"
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

ALTER TABLE "public"."StockMovement"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "StockMovement_createdById_idx"
  ON "public"."StockMovement" ("createdById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StockMovement_createdById_fkey'
  ) THEN
    ALTER TABLE "public"."StockMovement"
      ADD CONSTRAINT "StockMovement_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "public"."User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
