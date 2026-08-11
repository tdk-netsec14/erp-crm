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
let testCustomerId: string;

const ADMIN_EMAIL = "cust-test-admin@erp.test";
const SALES_EMAIL = "cust-test-sales@erp.test";
const WAREHOUSE_EMAIL = "cust-test-warehouse@erp.test";
const ACCOUNTS_EMAIL = "cust-test-accounts@erp.test";

async function makeUser(email: string, role: Role) {
  const passwordHash = await bcrypt.hash("Test@1234", 10);
  await prisma.user.upsert({ where: { email }, update: {}, create: { email, passwordHash, role, name: `Test ${role}` } });
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
  if (testCustomerId) {
    await prisma.customerFollowUp.deleteMany({ where: { customerId: testCustomerId } });
    await prisma.customer.deleteMany({ where: { id: testCustomerId } });
  }
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, SALES_EMAIL, WAREHOUSE_EMAIL, ACCOUNTS_EMAIL] } } });
  await prisma.$disconnect();
});

describe("Customers CRUD", () => {
  it("Sales can create a customer", async () => {
    const res = await request(app)
      .post("/v1/customers")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        name: "Test Customer",
        mobile: "9876543290",
        type: "WHOLESALE",
        address: "123 Test St, Mumbai",
        status: "ACTIVE",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test Customer");
    testCustomerId = res.body.id;
  });

  it("Warehouse cannot create a customer (403)", async () => {
    const res = await request(app)
      .post("/v1/customers")
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({ name: "X", mobile: "9000000000", type: "RETAIL", address: "X", status: "LEAD" });

    expect(res.status).toBe(403);
  });

  it("All roles can list customers", async () => {
    for (const token of [adminToken, salesToken, warehouseToken, accountsToken]) {
      const res = await request(app).get("/v1/customers").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
    }
  });

  it("Can search customers by name", async () => {
    const res = await request(app)
      .get("/v1/customers?search=Test+Customer")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((c: { name: string }) => c.name === "Test Customer")).toBe(true);
  });

  it("Returns 404 for non-existent customer", async () => {
    const res = await request(app)
      .get("/v1/customers/non-existent")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("Validates required fields on create", async () => {
    const res = await request(app)
      .post("/v1/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "", mobile: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("Customer Follow-ups", () => {
  it("Sales can add a follow-up", async () => {
    const res = await request(app)
      .post(`/v1/customers/${testCustomerId}/follow-ups`)
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ note: "Called customer, interested in bulk order" });

    expect(res.status).toBe(201);
    expect(res.body.note).toContain("bulk order");
  });

  it("Warehouse cannot add a follow-up (403)", async () => {
    const res = await request(app)
      .post(`/v1/customers/${testCustomerId}/follow-ups`)
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({ note: "test" });

    expect(res.status).toBe(403);
  });

  it("Accounts can list follow-ups", async () => {
    const res = await request(app)
      .get(`/v1/customers/${testCustomerId}/follow-ups`)
      .set("Authorization", `Bearer ${accountsToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
