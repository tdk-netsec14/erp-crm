import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient, Role, StockMovementType } from "@prisma/client";
import bcrypt from "bcryptjs";
import app from "../src/app";

const prisma = new PrismaClient();

let adminToken: string;
let salesToken: string;
let testCustomerId: string;
let testProductId: string;
const INITIAL_STOCK = 50;

const ADMIN_EMAIL = "challan-test-admin@erp.test";
const SALES_EMAIL = "challan-test-sales@erp.test";

async function makeUser(email: string, role: Role) {
  const passwordHash = await bcrypt.hash("Test@1234", 10);
  const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email, passwordHash, role, name: `Test ${role}` } });
  const res = await request(app).post("/v1/auth/login").send({ email, password: "Test@1234" });
  return { token: res.body.accessToken as string, id: user.id };
}

beforeAll(async () => {
  const admin = await makeUser(ADMIN_EMAIL, Role.ADMIN);
  const sales = await makeUser(SALES_EMAIL, Role.SALES);
  adminToken = admin.token;
  salesToken = sales.token;

  // Create test fixtures
  const customer = await prisma.customer.create({
    data: {
      name: "Challan Test Customer",
      mobile: "9000000099",
      type: "WHOLESALE",
      address: "Test Address",
      status: "ACTIVE",
      createdById: admin.id,
    },
  });
  testCustomerId = customer.id;

  const product = await prisma.product.create({
    data: {
      name: "Challan Test Product",
      sku: `CHAL-TEST-${Date.now()}`,
      category: "Bearings",
      unitPrice: 100,
      currentStock: INITIAL_STOCK,
      minStockAlert: 5,
      location: "Rack X",
    },
  });
  testProductId = product.id;
});

afterAll(async () => {
  // Clean up in reverse dependency order
  await prisma.stockMovement.deleteMany({ where: { productId: testProductId } });
  await prisma.challanItem.deleteMany({ where: { productId: testProductId } });
  await prisma.challan.deleteMany({ where: { customerId: testCustomerId } });
  await prisma.customer.deleteMany({ where: { id: testCustomerId } });
  await prisma.product.deleteMany({ where: { id: testProductId } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, SALES_EMAIL] } } });
  await prisma.$disconnect();
});

async function createTestChallan(qty = 10) {
  const res = await request(app)
    .post("/v1/challans")
    .set("Authorization", `Bearer ${salesToken}`)
    .send({
      customerId: testCustomerId,
      items: [{ productId: testProductId, quantity: qty }],
    });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe("Challan CRUD", () => {
  it("Sales can create a draft challan", async () => {
    const res = await request(app)
      .post("/v1/challans")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        customerId: testCustomerId,
        items: [{ productId: testProductId, quantity: 5 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("DRAFT");
    expect(res.body.challanNumber).toMatch(/^CH-\d{4}-\d{4}$/);
    expect(res.body.totalQuantity).toBe(5);
  });

  it("Rejects challan with empty items", async () => {
    const res = await request(app)
      .post("/v1/challans")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ customerId: testCustomerId, items: [] });

    expect(res.status).toBe(400);
  });

  it("Rejects challan with non-existent product", async () => {
    const res = await request(app)
      .post("/v1/challans")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ customerId: testCustomerId, items: [{ productId: "does-not-exist", quantity: 1 }] });

    expect(res.status).toBe(404);
  });
});

describe("Challan confirmation — happy path", () => {
  it("Confirming deducts stock and creates StockMovement rows", async () => {
    const stockBefore = (await prisma.product.findUnique({ where: { id: testProductId } }))!.currentStock;
    const orderQty = 10;

    const challanId = await createTestChallan(orderQty);

    const confirmRes = await request(app)
      .post(`/v1/challans/${challanId}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.status).toBe("CONFIRMED");
    expect(confirmRes.body.confirmedAt).toBeTruthy();

    const productAfter = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(productAfter!.currentStock).toBe(stockBefore - orderQty);

    // Verify StockMovement was written
    const movement = await prisma.stockMovement.findFirst({
      where: {
        productId: testProductId,
        type: StockMovementType.OUT,
        reason: { contains: confirmRes.body.challanNumber },
      },
    });
    expect(movement).toBeTruthy();
    expect(movement!.quantityChanged).toBe(orderQty);
  });
});

describe("Challan confirmation — insufficient stock", () => {
  it("Returns 422 with product name when stock is insufficient", async () => {
    const currentStock = (await prisma.product.findUnique({ where: { id: testProductId } }))!.currentStock;
    const overQty = currentStock + 100; // definitely more than available

    const challanId = await createTestChallan(overQty);

    const res = await request(app)
      .post(`/v1/challans/${challanId}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("UNPROCESSABLE");
    expect(res.body.error.message).toContain("Insufficient stock");
    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details[0]).toHaveProperty("productName");
  });

  it("Leaves stock unchanged after failed confirm", async () => {
    const stockBefore = (await prisma.product.findUnique({ where: { id: testProductId } }))!.currentStock;
    const challanId = await createTestChallan(stockBefore + 100);

    await request(app)
      .post(`/v1/challans/${challanId}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);

    const stockAfter = (await prisma.product.findUnique({ where: { id: testProductId } }))!.currentStock;
    expect(stockAfter).toBe(stockBefore); // Unchanged — transaction rolled back
  });
});

describe("Challan confirmation — already confirmed", () => {
  it("Returns 409 if challan is already CONFIRMED", async () => {
    const currentStock = (await prisma.product.findUnique({ where: { id: testProductId } }))!.currentStock;
    const challanId = await createTestChallan(Math.min(2, currentStock));

    await request(app).post(`/v1/challans/${challanId}/confirm`).set("Authorization", `Bearer ${adminToken}`);
    const secondConfirm = await request(app).post(`/v1/challans/${challanId}/confirm`).set("Authorization", `Bearer ${adminToken}`);

    expect(secondConfirm.status).toBe(409);
    expect(secondConfirm.body.error.code).toBe("CONFLICT");
  });
});

describe("Challan cancellation — stock reversal", () => {
  it("Cancelling a CONFIRMED challan reverses stock and preserves OUT movement", async () => {
    const stockBefore = (await prisma.product.findUnique({ where: { id: testProductId } }))!.currentStock;
    const orderQty = Math.min(5, stockBefore);

    const challanId = await createTestChallan(orderQty);
    const challan = await prisma.challan.findUnique({ where: { id: challanId } });

    // Confirm first
    await request(app).post(`/v1/challans/${challanId}/confirm`).set("Authorization", `Bearer ${adminToken}`);

    const stockAfterConfirm = (await prisma.product.findUnique({ where: { id: testProductId } }))!.currentStock;
    expect(stockAfterConfirm).toBe(stockBefore - orderQty);

    // Now cancel
    const cancelRes = await request(app)
      .post(`/v1/challans/${challanId}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe("CANCELLED");

    const stockAfterCancel = (await prisma.product.findUnique({ where: { id: testProductId } }))!.currentStock;
    expect(stockAfterCancel).toBe(stockBefore); // Fully restored

    // Both OUT (original) and IN (reversal) movements must exist — audit trail intact
    const outMovements = await prisma.stockMovement.findMany({
      where: { productId: testProductId, type: StockMovementType.OUT, reason: { contains: challan!.challanNumber } },
    });
    const inMovements = await prisma.stockMovement.findMany({
      where: { productId: testProductId, type: StockMovementType.IN, reason: { contains: challan!.challanNumber } },
    });

    expect(outMovements.length).toBeGreaterThan(0);
    expect(inMovements.length).toBeGreaterThan(0);
  });

  it("Cancelling a DRAFT is a no-op on stock", async () => {
    const stockBefore = (await prisma.product.findUnique({ where: { id: testProductId } }))!.currentStock;
    const challanId = await createTestChallan(3);

    await request(app).post(`/v1/challans/${challanId}/cancel`).set("Authorization", `Bearer ${adminToken}`);

    const stockAfter = (await prisma.product.findUnique({ where: { id: testProductId } }))!.currentStock;
    expect(stockAfter).toBe(stockBefore); // No stock change
  });

  it("Double-cancellation returns 409", async () => {
    const challanId = await createTestChallan(1);
    await request(app).post(`/v1/challans/${challanId}/cancel`).set("Authorization", `Bearer ${adminToken}`);
    const second = await request(app).post(`/v1/challans/${challanId}/cancel`).set("Authorization", `Bearer ${adminToken}`);

    expect(second.status).toBe(409);
  });
});

describe("Challan RBAC", () => {
  it("Warehouse cannot confirm a challan (403)", async () => {
    const [warehouseRes] = await Promise.all([
      makeUser("challan-warehouse@erp.test", Role.WAREHOUSE),
    ]);
    const challanId = await createTestChallan(1);

    const res = await request(app)
      .post(`/v1/challans/${challanId}/confirm`)
      .set("Authorization", `Bearer ${warehouseRes.token}`);

    expect(res.status).toBe(403);
    await prisma.user.deleteMany({ where: { email: "challan-warehouse@erp.test" } });
  });
});
