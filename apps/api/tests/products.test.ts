import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import app from "../src/app";

const prisma = new PrismaClient();

let adminToken: string;
let salesToken: string;
let warehouseToken: string;
let accountsToken: string;
let testProductId: string;

const ADMIN_EMAIL = "prod-test-admin@erp.test";
const SALES_EMAIL = "prod-test-sales@erp.test";
const WAREHOUSE_EMAIL = "prod-test-warehouse@erp.test";
const ACCOUNTS_EMAIL = "prod-test-accounts@erp.test";

async function makeUser(email: string, role: Role) {
  const passwordHash = await bcrypt.hash("Test@1234", 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role, name: `Test ${role}` },
  });
  const res = await request(app).post("/v1/auth/login").send({ email, password: "Test@1234" });
  return res.body.accessToken as string;
}

beforeAll(async () => {
  adminToken = await makeUser(ADMIN_EMAIL, Role.ADMIN);
  salesToken = await makeUser(SALES_EMAIL, Role.SALES);
  warehouseToken = await makeUser(WAREHOUSE_EMAIL, Role.WAREHOUSE);
  accountsToken = await makeUser(ACCOUNTS_EMAIL, Role.ACCOUNTS);
});

afterAll(async () => {
  if (testProductId) {
    await prisma.challanItem.deleteMany({ where: { productId: testProductId } });
    await prisma.stockMovement.deleteMany({ where: { productId: testProductId } });
    await prisma.product.deleteMany({ where: { id: testProductId } });
  }
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, SALES_EMAIL, WAREHOUSE_EMAIL, ACCOUNTS_EMAIL] } } });
  await prisma.$disconnect();
});

describe("Products CRUD", () => {
  const testSku = `TEST-SKU-${Date.now()}`;

  it("Warehouse can create a product", async () => {
    const res = await request(app)
      .post("/v1/products")
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({
        name: "Test Product",
        sku: testSku,
        category: "Bearings",
        unitPrice: 99.99,
        currentStock: 100,
        minStockAlert: 10,
        location: "Rack T1",
      });

    expect(res.status).toBe(201);
    expect(res.body.sku).toBe(testSku);
    testProductId = res.body.id;
  });

  it("Sales cannot create a product (403)", async () => {
    const res = await request(app)
      .post("/v1/products")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ name: "X", sku: "X-SKU", category: "X", unitPrice: 1, currentStock: 0, minStockAlert: 0, location: "X" });

    expect(res.status).toBe(403);
  });

  it("All roles can list products", async () => {
    for (const token of [adminToken, salesToken, warehouseToken, accountsToken]) {
      const res = await request(app)
        .get("/v1/products")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("meta");
    }
  });

  it("Returns 404 for non-existent product", async () => {
    const res = await request(app)
      .get("/v1/products/non-existent-id")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe("Stock Movements", () => {
  it("Warehouse can add a stock-in movement", async () => {
    const res = await request(app)
      .post(`/v1/products/${testProductId}/stock-movements`)
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({ type: "IN", quantityChanged: 50, reason: "Test delivery" });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe("IN");
    expect(res.body.quantityChanged).toBe(50);
  });

  it("Rejects OUT movement that would drive stock negative (422)", async () => {
    // Product has 100 + 50 = 150 in stock; requesting 200 out should fail
    const res = await request(app)
      .post(`/v1/products/${testProductId}/stock-movements`)
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({ type: "OUT", quantityChanged: 200, reason: "More than available" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("UNPROCESSABLE");
  });

  it("Sales cannot add stock movements (403)", async () => {
    const res = await request(app)
      .post(`/v1/products/${testProductId}/stock-movements`)
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ type: "IN", quantityChanged: 10, reason: "test" });

    expect(res.status).toBe(403);
  });

  it("Validates that quantityChanged is positive", async () => {
    const res = await request(app)
      .post(`/v1/products/${testProductId}/stock-movements`)
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({ type: "IN", quantityChanged: -5, reason: "Invalid" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
