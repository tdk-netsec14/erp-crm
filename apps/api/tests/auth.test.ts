import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import app from "../src/app";

// Tests run against a real Postgres DB (DATABASE_URL points to test DB in CI).
// We don't mock Prisma — real integration tests catch issues mocks never would.
const prisma = new PrismaClient();


let adminRefreshToken: string;

const TEST_USERS = {
  admin: { email: "test-admin@erp.test", password: "Admin@123", role: "ADMIN" as const, name: "Test Admin" },
  sales: { email: "test-sales@erp.test", password: "Sales@123", role: "SALES" as const, name: "Test Sales" },
  warehouse: { email: "test-warehouse@erp.test", password: "Warehouse@123", role: "WAREHOUSE" as const, name: "Test Warehouse" },
  accounts: { email: "test-accounts@erp.test", password: "Accounts@123", role: "ACCOUNTS" as const, name: "Test Accounts" },
};

type TestUser = { email: string; password: string; role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS"; name: string };

async function createTestUser(userData: TestUser) {
  const passwordHash = await bcrypt.hash(userData.password, 10); // Lower cost for tests
  return prisma.user.upsert({
    where: { email: userData.email },
    update: {},
    create: { email: userData.email, passwordHash, role: userData.role, name: userData.name },
  });
}

beforeAll(async () => {
  // Create test users and get tokens
  for (const userData of Object.values(TEST_USERS)) {
    await createTestUser(userData);
  }

  const adminLogin = await request(app)
    .post("/v1/auth/login")
    .send({ email: TEST_USERS.admin.email, password: TEST_USERS.admin.password });
  adminRefreshToken = adminLogin.body.refreshToken;
});

afterAll(async () => {
  // Clean up test users
  await prisma.user.deleteMany({
    where: { email: { in: Object.values(TEST_USERS).map((u) => u.email) } },
  });
  await prisma.$disconnect();
});

describe("POST /v1/auth/login", () => {
  it("returns access + refresh tokens on valid credentials", async () => {
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: TEST_USERS.admin.email, password: TEST_USERS.admin.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body.user.role).toBe("ADMIN");
  });

  it("rejects invalid password with 401", async () => {
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: TEST_USERS.admin.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects non-existent user with 401 (same error — no user enumeration)", async () => {
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "nobody@erp.test", password: "anypassword" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 on invalid input", async () => {
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "not-an-email", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /v1/auth/refresh", () => {
  it("issues a new access token with valid refresh token", async () => {
    const res = await request(app)
      .post("/v1/auth/refresh")
      .send({ refreshToken: adminRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
  });

  it("rejects invalid refresh token with 401", async () => {
    const res = await request(app)
      .post("/v1/auth/refresh")
      .send({ refreshToken: "invalid.token.here" });

    expect(res.status).toBe(401);
  });
});

describe("POST /v1/auth/logout", () => {
  it("revokes the refresh token and returns 204", async () => {
    // Get a fresh token pair to revoke
    const loginRes = await request(app)
      .post("/v1/auth/login")
      .send({ email: TEST_USERS.sales.email, password: TEST_USERS.sales.password });
    const refreshToken = loginRes.body.refreshToken;

    const logoutRes = await request(app)
      .post("/v1/auth/logout")
      .send({ refreshToken });

    expect(logoutRes.status).toBe(204);

    // Attempting to refresh with the revoked token should now fail
    const refreshRes = await request(app)
      .post("/v1/auth/refresh")
      .send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  it("is idempotent — revoking an already-revoked token returns 204", async () => {
    const loginRes = await request(app)
      .post("/v1/auth/login")
      .send({ email: TEST_USERS.warehouse.email, password: TEST_USERS.warehouse.password });
    const refreshToken = loginRes.body.refreshToken;

    await request(app).post("/v1/auth/logout").send({ refreshToken });
    const secondLogout = await request(app).post("/v1/auth/logout").send({ refreshToken });

    expect(secondLogout.status).toBe(204);
  });
});

describe("Protected routes", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/v1/customers");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/v1/customers")
      .set("Authorization", "Bearer bad.token.here");
    expect(res.status).toBe(401);
  });
});
