DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'OrderStatus'
  ) THEN
    CREATE TYPE "public"."OrderStatus" AS ENUM ('NEW', 'IN_DELIVERY', 'DELIVERED', 'CANCELED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'OrderChannel'
  ) THEN
    CREATE TYPE "public"."OrderChannel" AS ENUM ('WEBSITE', 'TELEGRAM', 'PHONE', 'OTHER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'CustomRequestStatus'
  ) THEN
    CREATE TYPE "public"."CustomRequestStatus" AS ENUM ('PENDING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'CANCELED');
  END IF;
END $$;

ALTER TABLE "public"."Expense"
  ADD COLUMN IF NOT EXISTS "expenseItemId" TEXT;

ALTER TABLE "public"."ExpenseCategory"
  ADD COLUMN IF NOT EXISTS "productCategoryId" TEXT;

CREATE TABLE IF NOT EXISTS "public"."ExpenseItem" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "productId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "address" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "points" INTEGER NOT NULL DEFAULT 0,
  "birthday" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Order" (
  "id" TEXT NOT NULL,
  "trackCode" TEXT,
  "date" VARCHAR(10) NOT NULL,
  "customerName" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "source" TEXT NOT NULL DEFAULT 'ERP',
  "channel" "public"."OrderChannel" NOT NULL DEFAULT 'WEBSITE',
  "status" "public"."OrderStatus" NOT NULL DEFAULT 'NEW',
  "total" INTEGER NOT NULL,
  "note" TEXT,
  "createdById" TEXT,
  "customerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT,
  "productName" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "lineTotal" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Review" (
  "id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "productId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."CustomRequest" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "referenceImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "desiredDate" TEXT NOT NULL,
  "status" "public"."CustomRequestStatus" NOT NULL DEFAULT 'PENDING',
  "priceQuote" INTEGER,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "discount" INTEGER NOT NULL,
  "isPercent" BOOLEAN NOT NULL DEFAULT false,
  "minOrder" INTEGER NOT NULL DEFAULT 0,
  "maxUses" INTEGER NOT NULL DEFAULT 1,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Post" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "image" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExpenseItem_categoryId_idx" ON "public"."ExpenseItem" ("categoryId");
CREATE INDEX IF NOT EXISTS "ExpenseItem_productId_idx" ON "public"."ExpenseItem" ("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseItem_categoryId_name_key" ON "public"."ExpenseItem" ("categoryId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_phone_key" ON "public"."Customer" ("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_trackCode_key" ON "public"."Order" ("trackCode");
CREATE INDEX IF NOT EXISTS "Order_date_idx" ON "public"."Order" ("date");
CREATE INDEX IF NOT EXISTS "Order_source_idx" ON "public"."Order" ("source");
CREATE INDEX IF NOT EXISTS "Order_channel_idx" ON "public"."Order" ("channel");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "public"."Order" ("status");
CREATE INDEX IF NOT EXISTS "Order_createdById_idx" ON "public"."Order" ("createdById");
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "public"."Order" ("customerId");
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "public"."OrderItem" ("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "public"."OrderItem" ("productId");
CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "public"."Review" ("productId");
CREATE INDEX IF NOT EXISTS "Review_customerId_idx" ON "public"."Review" ("customerId");
CREATE INDEX IF NOT EXISTS "CustomRequest_customerId_idx" ON "public"."CustomRequest" ("customerId");
CREATE INDEX IF NOT EXISTS "CustomRequest_status_idx" ON "public"."CustomRequest" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "public"."Coupon" ("code");
CREATE INDEX IF NOT EXISTS "Coupon_code_idx" ON "public"."Coupon" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Post_slug_key" ON "public"."Post" ("slug");
CREATE INDEX IF NOT EXISTS "Post_slug_idx" ON "public"."Post" ("slug");
CREATE INDEX IF NOT EXISTS "Expense_expenseItemId_idx" ON "public"."Expense" ("expenseItemId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseCategory_productCategoryId_fkey') THEN
    ALTER TABLE "public"."ExpenseCategory"
      ADD CONSTRAINT "ExpenseCategory_productCategoryId_fkey"
      FOREIGN KEY ("productCategoryId") REFERENCES "public"."ProductCategory" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Expense_expenseItemId_fkey') THEN
    ALTER TABLE "public"."Expense"
      ADD CONSTRAINT "Expense_expenseItemId_fkey"
      FOREIGN KEY ("expenseItemId") REFERENCES "public"."ExpenseItem" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseItem_categoryId_fkey') THEN
    ALTER TABLE "public"."ExpenseItem"
      ADD CONSTRAINT "ExpenseItem_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "public"."ExpenseCategory" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseItem_productId_fkey') THEN
    ALTER TABLE "public"."ExpenseItem"
      ADD CONSTRAINT "ExpenseItem_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_createdById_fkey') THEN
    ALTER TABLE "public"."Order"
      ADD CONSTRAINT "Order_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "public"."User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_customerId_fkey') THEN
    ALTER TABLE "public"."Order"
      ADD CONSTRAINT "Order_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "public"."Customer" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_orderId_fkey') THEN
    ALTER TABLE "public"."OrderItem"
      ADD CONSTRAINT "OrderItem_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "public"."Order" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_productId_fkey') THEN
    ALTER TABLE "public"."OrderItem"
      ADD CONSTRAINT "OrderItem_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_productId_fkey') THEN
    ALTER TABLE "public"."Review"
      ADD CONSTRAINT "Review_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_customerId_fkey') THEN
    ALTER TABLE "public"."Review"
      ADD CONSTRAINT "Review_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "public"."Customer" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomRequest_customerId_fkey') THEN
    ALTER TABLE "public"."CustomRequest"
      ADD CONSTRAINT "CustomRequest_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "public"."Customer" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
