DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'CashbackTransactionType'
  ) THEN
    CREATE TYPE "public"."CashbackTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUSTMENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."TelegramCashbackUser" (
  "id" TEXT NOT NULL,
  "telegramId" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "barcode" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "verifiedMember" BOOLEAN NOT NULL DEFAULT false,
  "lastMembershipStatus" TEXT,
  "lastMembershipCheckAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramCashbackUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."CashbackTransaction" (
  "id" TEXT NOT NULL,
  "type" "public"."CashbackTransactionType" NOT NULL DEFAULT 'EARN',
  "amount" INTEGER NOT NULL,
  "saleAmount" INTEGER NOT NULL DEFAULT 0,
  "ratePercent" INTEGER NOT NULL DEFAULT 0,
  "barcode" TEXT NOT NULL,
  "note" TEXT,
  "telegramCashbackUserId" TEXT NOT NULL,
  "branchId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CashbackTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."Sale"
  ADD COLUMN IF NOT EXISTS "cashbackTransactionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramCashbackUser_telegramId_key"
  ON "public"."TelegramCashbackUser" ("telegramId");
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramCashbackUser_barcode_key"
  ON "public"."TelegramCashbackUser" ("barcode");
CREATE INDEX IF NOT EXISTS "TelegramCashbackUser_barcode_idx"
  ON "public"."TelegramCashbackUser" ("barcode");
CREATE INDEX IF NOT EXISTS "CashbackTransaction_telegramCashbackUserId_idx"
  ON "public"."CashbackTransaction" ("telegramCashbackUserId");
CREATE INDEX IF NOT EXISTS "CashbackTransaction_branchId_idx"
  ON "public"."CashbackTransaction" ("branchId");
CREATE INDEX IF NOT EXISTS "CashbackTransaction_createdById_idx"
  ON "public"."CashbackTransaction" ("createdById");
CREATE INDEX IF NOT EXISTS "CashbackTransaction_barcode_idx"
  ON "public"."CashbackTransaction" ("barcode");
CREATE INDEX IF NOT EXISTS "Sale_cashbackTransactionId_idx"
  ON "public"."Sale" ("cashbackTransactionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CashbackTransaction_telegramCashbackUserId_fkey'
  ) THEN
    ALTER TABLE "public"."CashbackTransaction"
      ADD CONSTRAINT "CashbackTransaction_telegramCashbackUserId_fkey"
      FOREIGN KEY ("telegramCashbackUserId") REFERENCES "public"."TelegramCashbackUser" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CashbackTransaction_branchId_fkey'
  ) THEN
    ALTER TABLE "public"."CashbackTransaction"
      ADD CONSTRAINT "CashbackTransaction_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "public"."Branch" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CashbackTransaction_createdById_fkey'
  ) THEN
    ALTER TABLE "public"."CashbackTransaction"
      ADD CONSTRAINT "CashbackTransaction_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "public"."User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Sale_cashbackTransactionId_fkey'
  ) THEN
    ALTER TABLE "public"."Sale"
      ADD CONSTRAINT "Sale_cashbackTransactionId_fkey"
      FOREIGN KEY ("cashbackTransactionId") REFERENCES "public"."CashbackTransaction" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
