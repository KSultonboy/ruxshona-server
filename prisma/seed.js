const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function upsertUser({ name, username, password, role, roleLabel, branchId }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { username },
    update: {
      name,
      passwordHash,
      role,
      roleLabel: roleLabel ?? null,
      branchId: branchId ?? null,
      active: true,
    },
    create: {
      name,
      username,
      passwordHash,
      role,
      roleLabel: roleLabel ?? null,
      branchId: branchId ?? null,
      active: true,
    },
  });
}

async function upsertProduct({ barcode, ...data }) {
  return prisma.product.upsert({
    where: { barcode },
    update: data,
    create: {
      barcode,
      images: [],
      stock: 0,
      minStock: 0,
      active: true,
      ...data,
    },
  });
}

async function main() {
  const branchCentral = await prisma.branch.upsert({
    where: { name: "Central" },
    update: { address: "Main 1", phone: "+998900000001", warehouseMode: "CENTRAL" },
    create: {
      name: "Central",
      address: "Main 1",
      phone: "+998900000001",
      warehouseMode: "CENTRAL",
    },
  });

  await prisma.branch.upsert({
    where: { name: "Chilonzor" },
    update: { address: "Main 2", phone: "+998900000002", warehouseMode: "SEPARATE" },
    create: {
      name: "Chilonzor",
      address: "Main 2",
      phone: "+998900000002",
      warehouseMode: "SEPARATE",
    },
  });

  await prisma.shop.upsert({
    where: { name: "Shop A" },
    update: { address: "Shop 1", phone: "+998900000101" },
    create: {
      name: "Shop A",
      address: "Shop 1",
      phone: "+998900000101",
    },
  });

  const unitDona = await prisma.unit.upsert({
    where: { name_short: { name: "dona", short: "pcs" } },
    update: {},
    create: { name: "dona", short: "pcs" },
  });

  const unitKg = await prisma.unit.upsert({
    where: { name_short: { name: "kg", short: "kg" } },
    update: {},
    create: { name: "kg", short: "kg" },
  });

  const catCakes = await prisma.productCategory.upsert({
    where: { name: "Cakes" },
    update: {},
    create: { name: "Cakes" },
  });

  const catIngredients = await prisma.productCategory.upsert({
    where: { name: "Ingredients" },
    update: {},
    create: { name: "Ingredients" },
  });

  const catDecor = await prisma.productCategory.upsert({
    where: { name: "Decor" },
    update: {},
    create: { name: "Decor" },
  });

  await prisma.expenseCategory.upsert({
    where: { name: "Ingredients" },
    update: {},
    create: { name: "Ingredients" },
  });

  await prisma.expenseCategory.upsert({
    where: { name: "Decor" },
    update: {},
    create: { name: "Decor" },
  });

  await prisma.expenseCategory.upsert({
    where: { name: "Utilities" },
    update: {},
    create: { name: "Utilities" },
  });

  await upsertUser({
    name: "Admin",
    username: "admin",
    password: "admin123",
    role: "ADMIN",
  });

  await upsertUser({
    name: "Sales User",
    username: "sales1",
    password: "sales123",
    role: "SALES",
    branchId: branchCentral.id,
  });

  await upsertUser({
    name: "Production User",
    username: "prod1",
    password: "prod123",
    role: "PRODUCTION",
  });

  await upsertUser({
    name: "Auditor",
    username: "auditor1",
    password: "audit123",
    role: "SALES",
  });

  await upsertProduct({
    barcode: "111111",
    name: "Napoleon",
    type: "PRODUCT",
    categoryId: catCakes.id,
    unitId: unitDona.id,
    price: 100000,
    salePrice: 120000,
  });

  await upsertProduct({
    barcode: "222222",
    name: "Cream",
    type: "INGREDIENT",
    categoryId: catIngredients.id,
    unitId: unitKg.id,
    price: 20000,
  });

  await upsertProduct({
    barcode: "333333",
    name: "Box",
    type: "DECOR",
    categoryId: catDecor.id,
    unitId: unitDona.id,
    price: 5000,
  });

  console.log("Seed complete.");
  console.log("Login users:");
  console.log("admin/admin123");
  console.log("sales1/sales123");
  console.log("prod1/prod123");
  console.log("auditor1/audit123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
