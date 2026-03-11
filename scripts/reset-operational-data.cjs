#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const preservedTables = [
  'Product',
  'ProductCategory',
  'ExpenseCategory',
  'ExpenseItem',
  'Unit',
  'Branch',
  'Shop',
  'User',
  'UserPermission',
];

const clearedTables = [
  'BranchStock',
  'StockMovement',
  'Transfer',
  'TransferItem',
  'Return',
  'ReturnItem',
  'Sale',
  'Expense',
  'Payment',
  'WagePayment',
  'Shift',
  'InventoryCheck',
  'InventoryCheckItem',
  'Order',
  'OrderItem',
  'Customer',
  'Review',
  'CustomRequest',
  'Coupon',
  'Post',
  'AlertRule',
  'RefreshToken',
  'PushToken',
  'AuditLog',
  'TelegramCashbackUser',
  'CashbackTransaction',
];

async function snapshot(label) {
  const [
    products,
    productCategories,
    expenseCategories,
    expenseItems,
    units,
    branches,
    shops,
    users,
    userPermissions,
    branchStocks,
    stockMovements,
    transfers,
    transferItems,
    returns,
    returnItems,
    sales,
    expenses,
    payments,
    wages,
    shifts,
    inventoryChecks,
    orders,
    customers,
    reviews,
    customRequests,
    coupons,
    posts,
    alertRules,
    refreshTokens,
    pushTokens,
    auditLogs,
    cashbackUsers,
    cashbackTransactions,
    productStockSum,
    branchStockSum,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.productCategory.count(),
    prisma.expenseCategory.count(),
    prisma.expenseItem.count(),
    prisma.unit.count(),
    prisma.branch.count(),
    prisma.shop.count(),
    prisma.user.count(),
    prisma.userPermission.count(),
    prisma.branchStock.count(),
    prisma.stockMovement.count(),
    prisma.transfer.count(),
    prisma.transferItem.count(),
    prisma.return.count(),
    prisma.returnItem.count(),
    prisma.sale.count(),
    prisma.expense.count(),
    prisma.payment.count(),
    prisma.wagePayment.count(),
    prisma.shift.count(),
    prisma.inventoryCheck.count(),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.review.count(),
    prisma.customRequest.count(),
    prisma.coupon.count(),
    prisma.post.count(),
    prisma.alertRule.count(),
    prisma.refreshToken.count(),
    prisma.pushToken.count(),
    prisma.auditLog.count(),
    prisma.telegramCashbackUser.count(),
    prisma.cashbackTransaction.count(),
    prisma.product.aggregate({ _sum: { stock: true } }),
    prisma.branchStock.aggregate({ _sum: { quantity: true } }),
  ]);

  return {
    label,
    products,
    productCategories,
    expenseCategories,
    expenseItems,
    units,
    branches,
    shops,
    users,
    userPermissions,
    branchStocks,
    stockMovements,
    transfers,
    transferItems,
    returns,
    returnItems,
    sales,
    expenses,
    payments,
    wages,
    shifts,
    inventoryChecks,
    orders,
    customers,
    reviews,
    customRequests,
    coupons,
    posts,
    alertRules,
    refreshTokens,
    pushTokens,
    auditLogs,
    cashbackUsers,
    cashbackTransactions,
    productStockSum: Number(productStockSum._sum.stock || 0),
    branchStockSum: Number(branchStockSum._sum.quantity || 0),
  };
}

async function main() {
  const confirmed = process.argv.includes('--yes');

  console.log('Saqlanadigan master ma\'lumotlar:');
  console.log(`- ${preservedTables.join(', ')}`);
  console.log('Tozalanadigan operatsion ma\'lumotlar:');
  console.log(`- ${clearedTables.join(', ')}`);

  const before = await snapshot('BEFORE');
  console.log(JSON.stringify(before, null, 2));

  if (!confirmed) {
    console.log('');
    console.log('Dry run tugadi. Haqiqiy tozalash uchun quyidagini ishlating:');
    console.log('npm run reset:operational-data -- --yes');
    return;
  }

  const truncateSql = `TRUNCATE TABLE ${clearedTables
    .map((table) => `"${table}"`)
    .join(', ')} RESTART IDENTITY CASCADE`;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(truncateSql);
    await tx.product.updateMany({
      data: {
        stock: 0,
      },
    });
  });

  const after = await snapshot('AFTER');
  console.log(JSON.stringify(after, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
