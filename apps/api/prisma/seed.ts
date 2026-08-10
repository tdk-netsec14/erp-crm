import { PrismaClient, Role, CustomerType, CustomerStatus, StockMovementType, ChallanStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Demo credentials for all 4 roles — documented in README
const DEMO_USERS = [
  { name: "Admin User", email: "admin@erp.local", password: "Admin@123", role: Role.ADMIN },
  { name: "Sales Rep", email: "sales@erp.local", password: "Sales@123", role: Role.SALES },
  { name: "Warehouse Staff", email: "warehouse@erp.local", password: "Warehouse@123", role: Role.WAREHOUSE },
  { name: "Accounts User", email: "accounts@erp.local", password: "Accounts@123", role: Role.ACCOUNTS },
];

async function main() {
  console.info("Seeding database...");

  // Create users
  const users: Record<string, { id: string }> = {};
  for (const u of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
    users[u.role] = user;
  }

  // Create sample customers
  const customer1 = await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      name: "Sharma Traders",
      mobile: "9876543210",
      businessName: "Sharma Traders Pvt Ltd",
      gstNumber: "27AAPFU0939F1ZV",
      type: CustomerType.WHOLESALE,
      address: "123 Market Street, Mumbai, MH 400001",
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      notes: "Key account, prompt payer",
      createdById: users[Role.ADMIN].id,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: "seed-customer-2" },
    update: {},
    create: {
      id: "seed-customer-2",
      name: "Patel Distributors",
      mobile: "9876543211",
      businessName: "Patel & Sons Distribution",
      type: CustomerType.DISTRIBUTOR,
      address: "45 Industrial Area, Ahmedabad, GJ 380015",
      status: CustomerStatus.LEAD,
      followUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow — shows in dashboard
      createdById: users[Role.SALES].id,
    },
  });

  // Create sample products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: "PROD-001" },
      update: {},
      create: {
        id: "seed-product-1",
        name: "Industrial Bearings 6204",
        sku: "PROD-001",
        category: "Bearings",
        unitPrice: 125.50,
        currentStock: 200,
        minStockAlert: 20,
        location: "Rack A1",
      },
    }),
    prisma.product.upsert({
      where: { sku: "PROD-002" },
      update: {},
      create: {
        id: "seed-product-2",
        name: "Hydraulic Seal Kit 50mm",
        sku: "PROD-002",
        category: "Seals",
        unitPrice: 450.00,
        currentStock: 15, // below minStockAlert — shows in low-stock widget
        minStockAlert: 25,
        location: "Rack B3",
      },
    }),
    prisma.product.upsert({
      where: { sku: "PROD-003" },
      update: {},
      create: {
        id: "seed-product-3",
        name: "V-Belt Type A50",
        sku: "PROD-003",
        category: "Belts",
        unitPrice: 89.00,
        currentStock: 300,
        minStockAlert: 30,
        location: "Rack C2",
      },
    }),
  ]);

  // Add a stock movement to reflect initial stock IN (for audit trail completeness)
  for (const product of products) {
    const existing = await prisma.stockMovement.findFirst({
      where: { productId: product.id, reason: "Initial stock entry (seed)" },
    });
    if (!existing) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantityChanged: product.currentStock,
          type: StockMovementType.IN,
          reason: "Initial stock entry (seed)",
          createdById: users[Role.ADMIN].id,
        },
      });
    }
  }

  // Create a draft challan for demonstration
  const existingChallan = await prisma.challan.findFirst({ where: { challanNumber: "CH-2026-0001" } });
  if (!existingChallan) {
    await prisma.challan.create({
      data: {
        challanNumber: "CH-2026-0001",
        customerId: customer1.id,
        status: ChallanStatus.DRAFT,
        totalQuantity: 10,
        createdById: users[Role.SALES].id,
        items: {
          create: [
            {
              productId: products[0].id,
              productNameSnapshot: products[0].name,
              productSkuSnapshot: products[0].sku,
              unitPriceSnapshot: products[0].unitPrice,
              quantity: 10,
            },
          ],
        },
      },
    });
  }

  // Add a follow-up for the lead customer
  const existingFollowUp = await prisma.customerFollowUp.findFirst({
    where: { customerId: customer2.id },
  });
  if (!existingFollowUp) {
    await prisma.customerFollowUp.create({
      data: {
        customerId: customer2.id,
        note: "Initial contact made. Interested in hydraulic seals. Follow up for pricing.",
        createdById: users[Role.SALES].id,
      },
    });
  }

  console.info("Seed complete.");
  console.info("Demo credentials:");
  for (const u of DEMO_USERS) {
    console.info(`  ${u.role}: ${u.email} / ${u.password}`);
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
