DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Customer'
  ) THEN
    EXECUTE 'ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "birthday" TEXT';
    EXECUTE 'ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0';
  END IF;
END $$;
