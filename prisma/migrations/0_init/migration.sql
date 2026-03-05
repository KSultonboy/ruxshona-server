-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('PRODUCT', 'INGREDIENT', 'DECOR', 'UTILITY');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- CreateEnum
CREATE TYPE "public"."ExpenseCategoryType" AS ENUM ('NORMAL', 'SELLABLE');

-- CreateEnum
CREATE TYPE "public"."PaymentSourceType" AS ENUM ('BRANCH', 'SHOP');

-- CreateEnum
CREATE TYPE "public"."StockMovementType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "public"."TransferStatus" AS ENUM ('PENDING', 'RECEIVED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."TransferTargetType" AS ENUM ('BRANCH', 'SHOP');

-- CreateEnum
CREATE TYPE "public"."ReturnSourceType" AS ENUM ('BRANCH', 'SHOP');

-- CreateEnum
CREATE TYPE "public"."ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."InventoryCheckStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'SALES', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "public"."AlertRuleType" AS ENUM ('BRANCH_DEBT_LIMIT', 'BRANCH_STOCK_MIN', 'PAYMENT_OVERDUE_DAYS');

-- CreateEnum
CREATE TYPE "public"."Permission" AS ENUM ('USERS_READ', 'USERS_WRITE', 'BRANCHES_READ', 'BRANCHES_WRITE', 'SHOPS_READ', 'SHOPS_WRITE', 'PRODUCTS_READ', 'PRODUCTS_WRITE', 'EXPENSES_READ', 'EXPENSES_WRITE', 'WAREHOUSE_READ', 'WAREHOUSE_WRITE', 'TRANSFERS_READ', 'TRANSFERS_WRITE', 'TRANSFERS_RECEIVE', 'RETURNS_READ', 'RETURNS_WRITE', 'RETURNS_APPROVE', 'SALES_READ', 'SALES_WRITE', 'PAYMENTS_READ', 'PAYMENTS_WRITE', 'REPORTS_READ', 'ALERTS_READ', 'ALERTS_WRITE', 'AUDIT_READ');

-- CreateTable
CREATE TABLE "public"."Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ExpenseCategoryType" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "type" "public"."ProductType" NOT NULL,
    "price" INTEGER,
    "salePrice" INTEGER,
    "shopPrice" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "images" TEXT[],
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "labourPrice" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchStock" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "note" TEXT,
    "quantity" INTEGER,
    "categoryId" TEXT NOT NULL,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockMovement" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "type" "public"."StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "productId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transfer" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "status" "public"."TransferStatus" NOT NULL DEFAULT 'PENDING',
    "targetType" "public"."TransferTargetType" NOT NULL,
    "note" TEXT,
    "branchId" TEXT,
    "shopId" TEXT,
    "createdById" TEXT NOT NULL,
    "receivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "TransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Return" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "status" "public"."ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "sourceType" "public"."ReturnSourceType" NOT NULL,
    "note" TEXT,
    "branchId" TEXT,
    "shopId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shift" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "status" "public"."ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "photos" TEXT[],
    "branchId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'ADMIN',
    "roleLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "public"."Permission" NOT NULL,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "userId" TEXT,
    "userRole" "public"."UserRole",
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WagePayment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "note" TEXT,
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WagePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "sourceType" "public"."PaymentSourceType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "note" TEXT,
    "branchId" TEXT,
    "shopId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AlertRule" (
    "id" TEXT NOT NULL,
    "type" "public"."AlertRuleType" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "branchId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PushToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "device" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sale" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "price" INTEGER NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryCheck" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "status" "public"."InventoryCheckStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "branchId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryCheckItem" (
    "id" TEXT NOT NULL,
    "inventoryCheckId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "systemQuantity" INTEGER NOT NULL,
    "actualQuantity" INTEGER NOT NULL,

    CONSTRAINT "InventoryCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "public"."Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_name_key" ON "public"."Shop"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_short_key" ON "public"."Unit"("name", "short");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "public"."ProductCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "public"."ExpenseCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "public"."Product"("barcode");

-- CreateIndex
CREATE INDEX "Product_type_idx" ON "public"."Product"("type");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "public"."Product"("active");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "public"."Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_unitId_idx" ON "public"."Product"("unitId");

-- CreateIndex
CREATE INDEX "BranchStock_branchId_idx" ON "public"."BranchStock"("branchId");

-- CreateIndex
CREATE INDEX "BranchStock_productId_idx" ON "public"."BranchStock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchStock_branchId_productId_key" ON "public"."BranchStock"("branchId", "productId");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "public"."Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "public"."Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_productId_idx" ON "public"."Expense"("productId");

-- CreateIndex
CREATE INDEX "Expense_paymentMethod_idx" ON "public"."Expense"("paymentMethod");

-- CreateIndex
CREATE INDEX "StockMovement_date_idx" ON "public"."StockMovement"("date");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "public"."StockMovement"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_createdById_idx" ON "public"."StockMovement"("createdById");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "public"."StockMovement"("type");

-- CreateIndex
CREATE INDEX "Transfer_status_idx" ON "public"."Transfer"("status");

-- CreateIndex
CREATE INDEX "Transfer_targetType_idx" ON "public"."Transfer"("targetType");

-- CreateIndex
CREATE INDEX "Transfer_branchId_idx" ON "public"."Transfer"("branchId");

-- CreateIndex
CREATE INDEX "Transfer_shopId_idx" ON "public"."Transfer"("shopId");

-- CreateIndex
CREATE INDEX "Transfer_createdById_idx" ON "public"."Transfer"("createdById");

-- CreateIndex
CREATE INDEX "TransferItem_transferId_idx" ON "public"."TransferItem"("transferId");

-- CreateIndex
CREATE INDEX "TransferItem_productId_idx" ON "public"."TransferItem"("productId");

-- CreateIndex
CREATE INDEX "Return_status_idx" ON "public"."Return"("status");

-- CreateIndex
CREATE INDEX "Return_sourceType_idx" ON "public"."Return"("sourceType");

-- CreateIndex
CREATE INDEX "Return_branchId_idx" ON "public"."Return"("branchId");

-- CreateIndex
CREATE INDEX "Return_shopId_idx" ON "public"."Return"("shopId");

-- CreateIndex
CREATE INDEX "Return_createdById_idx" ON "public"."Return"("createdById");

-- CreateIndex
CREATE INDEX "ReturnItem_returnId_idx" ON "public"."ReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "ReturnItem_productId_idx" ON "public"."ReturnItem"("productId");

-- CreateIndex
CREATE INDEX "Shift_branchId_idx" ON "public"."Shift"("branchId");

-- CreateIndex
CREATE INDEX "Shift_openedById_idx" ON "public"."Shift"("openedById");

-- CreateIndex
CREATE INDEX "Shift_status_idx" ON "public"."Shift"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "public"."UserPermission"("userId");

-- CreateIndex
CREATE INDEX "UserPermission_branchId_idx" ON "public"."UserPermission"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permission_branchId_key" ON "public"."UserPermission"("userId", "permission", "branchId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "public"."AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "WagePayment_userId_idx" ON "public"."WagePayment"("userId");

-- CreateIndex
CREATE INDEX "WagePayment_date_idx" ON "public"."WagePayment"("date");

-- CreateIndex
CREATE INDEX "Payment_date_idx" ON "public"."Payment"("date");

-- CreateIndex
CREATE INDEX "Payment_sourceType_idx" ON "public"."Payment"("sourceType");

-- CreateIndex
CREATE INDEX "Payment_branchId_idx" ON "public"."Payment"("branchId");

-- CreateIndex
CREATE INDEX "Payment_shopId_idx" ON "public"."Payment"("shopId");

-- CreateIndex
CREATE INDEX "Payment_createdById_idx" ON "public"."Payment"("createdById");

-- CreateIndex
CREATE INDEX "AlertRule_type_idx" ON "public"."AlertRule"("type");

-- CreateIndex
CREATE INDEX "AlertRule_branchId_idx" ON "public"."AlertRule"("branchId");

-- CreateIndex
CREATE INDEX "AlertRule_productId_idx" ON "public"."AlertRule"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "public"."RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "public"."RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "public"."RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "public"."PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "public"."PushToken"("userId");

-- CreateIndex
CREATE INDEX "Sale_branchId_idx" ON "public"."Sale"("branchId");

-- CreateIndex
CREATE INDEX "Sale_productId_idx" ON "public"."Sale"("productId");

-- CreateIndex
CREATE INDEX "Sale_createdById_idx" ON "public"."Sale"("createdById");

-- CreateIndex
CREATE INDEX "Sale_date_idx" ON "public"."Sale"("date");

-- CreateIndex
CREATE INDEX "InventoryCheck_date_idx" ON "public"."InventoryCheck"("date");

-- CreateIndex
CREATE INDEX "InventoryCheck_status_idx" ON "public"."InventoryCheck"("status");

-- CreateIndex
CREATE INDEX "InventoryCheckItem_inventoryCheckId_idx" ON "public"."InventoryCheckItem"("inventoryCheckId");

-- CreateIndex
CREATE INDEX "InventoryCheckItem_productId_idx" ON "public"."InventoryCheckItem"("productId");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStock" ADD CONSTRAINT "BranchStock_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchStock" ADD CONSTRAINT "BranchStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transfer" ADD CONSTRAINT "Transfer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transfer" ADD CONSTRAINT "Transfer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transfer" ADD CONSTRAINT "Transfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transfer" ADD CONSTRAINT "Transfer_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransferItem" ADD CONSTRAINT "TransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "public"."Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransferItem" ADD CONSTRAINT "TransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Return" ADD CONSTRAINT "Return_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Return" ADD CONSTRAINT "Return_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Return" ADD CONSTRAINT "Return_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Return" ADD CONSTRAINT "Return_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReturnItem" ADD CONSTRAINT "ReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "public"."Return"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReturnItem" ADD CONSTRAINT "ReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shift" ADD CONSTRAINT "Shift_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shift" ADD CONSTRAINT "Shift_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WagePayment" ADD CONSTRAINT "WagePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WagePayment" ADD CONSTRAINT "WagePayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AlertRule" ADD CONSTRAINT "AlertRule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AlertRule" ADD CONSTRAINT "AlertRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryCheck" ADD CONSTRAINT "InventoryCheck_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryCheck" ADD CONSTRAINT "InventoryCheck_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryCheckItem" ADD CONSTRAINT "InventoryCheckItem_inventoryCheckId_fkey" FOREIGN KEY ("inventoryCheckId") REFERENCES "public"."InventoryCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryCheckItem" ADD CONSTRAINT "InventoryCheckItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;




