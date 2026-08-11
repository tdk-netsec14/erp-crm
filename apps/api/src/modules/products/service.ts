import { StockMovementType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { getPaginationParams, paginate } from "../../lib/pagination.js";
import type { CreateProductInput, UpdateProductInput, CreateStockMovementInput } from "./schemas.js";

export async function listProducts(query: {
  page?: string;
  limit?: string;
  category?: string;
  search?: string;
  lowStock?: string;
}) {
  const { page, limit, offset } = getPaginationParams(query);

  // When filtering low-stock, the column comparison (currentStock < minStockAlert)
  // must happen in the WHERE clause so that filtering happens BEFORE pagination.
  // Prisma's ORM can't compare two columns in a WHERE, so we use $queryRaw here.
  // Search/category inputs are passed as parameters to avoid SQL injection.
  if (query.lowStock === "true") {
    // Build a base where that can be extended with optional search/category
    const searchFilter = query.search ? `%${query.search}%` : null;
    const categoryFilter = query.category ?? null;

    // We construct queries with explicit parameter binding
    const [products, countResult] = await Promise.all([
      prisma.$queryRaw<Array<{
        id: string; name: string; sku: string; category: string;
        unitPrice: unknown; currentStock: number; minStockAlert: number;
        location: string; createdAt: Date; updatedAt: Date;
      }>>`
        SELECT p.* FROM "Product" p
        WHERE p."currentStock" < p."minStockAlert"
          AND p."minStockAlert" > 0
          AND (${searchFilter}::text IS NULL
               OR LOWER(p.name) LIKE LOWER(${searchFilter}::text)
               OR LOWER(p.sku) LIKE LOWER(${searchFilter}::text))
          AND (${categoryFilter}::text IS NULL
               OR LOWER(p.category) = LOWER(${categoryFilter}::text))
        ORDER BY p.name ASC
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "Product" p
        WHERE p."currentStock" < p."minStockAlert"
          AND p."minStockAlert" > 0
          AND (${searchFilter}::text IS NULL
               OR LOWER(p.name) LIKE LOWER(${searchFilter}::text)
               OR LOWER(p.sku) LIKE LOWER(${searchFilter}::text))
          AND (${categoryFilter}::text IS NULL
               OR LOWER(p.category) = LOWER(${categoryFilter}::text))
      `,
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return paginate(
      products.map((p) => ({ ...p, unitPrice: p.unitPrice, isLowStock: true })),
      total,
      page,
      limit
    );
  }

  const where = {
    ...(query.category ? { category: { equals: query.category, mode: "insensitive" as const } } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { sku: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  return paginate(
    data.map((p) => ({ ...p, isLowStock: p.currentStock < p.minStockAlert })),
    total,
    page,
    limit
  );
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError("Product", id);

  const recentMovements = await prisma.stockMovement.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return {
    ...product,
    isLowStock: product.currentStock < product.minStockAlert,
    recentMovements,
  };
}

export async function createProduct(input: CreateProductInput) {
  return prisma.product.create({ data: input });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError("Product", id);
  return prisma.product.update({ where: { id }, data: input });
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError("Product", id);

  const usedInChallan = await prisma.challanItem.findFirst({ where: { productId: id } });
  if (usedInChallan) {
    throw new UnprocessableError(
      "Can't delete a product that has been used in a challan. Mark it inactive instead."
    );
  }

  await prisma.product.delete({ where: { id } });
  return { deleted: true };
}

export async function createStockMovement(
  productId: string,
  input: CreateStockMovementInput,
  userId: string
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError("Product", productId);

  const delta = input.type === StockMovementType.IN ? input.quantityChanged : -input.quantityChanged;
  const newStock = product.currentStock + delta;

  if (newStock < 0) {
    throw new UnprocessableError(
      `Not enough stock. Current: ${product.currentStock}, requested: ${input.quantityChanged}`
    );
  }

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId,
        quantityChanged: input.quantityChanged,
        type: input.type,
        reason: input.reason,
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    }),
  ]);

  return movement;
}

export async function listStockMovements(productId: string, query: { page?: string; limit?: string }) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError("Product", productId);

  const { page, limit, offset } = getPaginationParams(query);

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.stockMovement.count({ where: { productId } }),
  ]);

  return paginate(data, total, page, limit);
}
