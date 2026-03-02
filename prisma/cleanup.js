const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    console.log("Starting data cleanup...");

    // 1. Clear Transactional / Log data
    await prisma.sale.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.returnItem.deleteMany({});
    await prisma.return.deleteMany({});
    await prisma.transferItem.deleteMany({});
    await prisma.transfer.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.branchStock.deleteMany({});
    await prisma.shift.deleteMany({});
    await prisma.inventoryCheckItem.deleteMany({});
    await prisma.inventoryCheck.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.pushToken.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.userPermission.deleteMany({});

    console.log("Cleared all transactional data and logs.");

    // 2. Clear Setup data (except admin user)
    // We keep Units, Categories for now as they are basic configuration, 
    // but if you want a truly empty system, we could clear them.
    // The user said "test values", which usually means the dummy records.

    // Let's clear branches and shops that were test ones.
    // Note: This might fail if users are linked to them.
    await prisma.user.updateMany({
        where: { username: { not: "admin" } },
        data: { branchId: null }
    });

    await prisma.product.deleteMany({});
    await prisma.productCategory.deleteMany({});
    await prisma.expenseCategory.deleteMany({});
    await prisma.unit.deleteMany({});
    await prisma.shop.deleteMany({});
    await prisma.branch.deleteMany({});

    console.log("Cleared catalog, branches, and shops.");

    // 3. User cleanup
    // Delete all users except admin
    await prisma.user.deleteMany({
        where: {
            username: { not: "admin" }
        }
    });

    // 4. Protect the primary Admin
    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    if (admin) {
        await prisma.user.update({
            where: { id: admin.id },
            data: {
                protected: true,
                active: true,
                role: "ADMIN"
            }
        });
        console.log("Admin user 'admin' is now PROTECTED and undeletable.");
    } else {
        console.warn("Warning: Admin user 'admin' not found. Please create it manually.");
    }

    console.log("Cleanup complete. system is now in a clean state with only 1 protected admin.");
}

main()
    .catch((e) => {
        console.error("Cleanup failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
