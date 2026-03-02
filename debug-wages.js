const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Testing connection...");
        // Test basic query
        const count = await prisma.product.count();
        console.log(`Product count: ${count}`);

        console.log("Testing Wages Report query...");
        const movements = await prisma.stockMovement.findMany({
            where: {
                type: 'IN', // Using string literal if enum not loaded, but typically enum required
                createdById: { not: null },
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        labourPrice: true,
                        unit: { select: { name: true, short: true } },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                    },
                },
            },
            take: 5
        });
        console.log("Query successful!");
        console.log(JSON.stringify(movements, null, 2));

    } catch (e) {
        console.error("ERROR OCCURRED:");
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
