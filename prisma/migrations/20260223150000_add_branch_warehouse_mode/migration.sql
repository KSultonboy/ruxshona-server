DO $$
BEGIN
  CREATE TYPE "BranchWarehouseMode" AS ENUM ('CENTRAL', 'SEPARATE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Branch"
ADD COLUMN IF NOT EXISTS "warehouseMode" "BranchWarehouseMode" NOT NULL DEFAULT 'SEPARATE';

