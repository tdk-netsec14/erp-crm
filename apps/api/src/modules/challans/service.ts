import { ChallanStatus, StockMovementType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ConflictError, UnprocessableError } from "../../lib/errors.js";
import { getPaginationParams, paginate } from "../../lib/pagination.js";
import type { CreateChallanInput, UpdateChallanInput } from "./schemas.js";

type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

// Generates a sequential challan number like CH-2026-0001.
// Counter is per-year and derived from existing records — no separate sequence table needed.
async function generateChallanNumber(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.challan.count({
    where: { challanNumber: { startsWith: `CH-${year}-` } },
  });
  return `CH-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function listChallans(query: {
  page?: string;
  limit?: string;
  status?: string;
  customerId?: string;
  search?: string;
}) {
  const { page, limit, offset } = getPaginationParams(query);

  const where = {
    ...(query.status ? { status: query.status as ChallanStatus } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.search
      ? { challanNumber: { contains: query.search, mode: "insensitive" as const } }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, businessName: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.challan.count({ where }),
  ]);

  return paginate(data, total, page, limit);
}

export async function getChallan(id: string) {
  const challan = await prisma.challan.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, businessName: true, mobile: true, address: true } },
      createdBy: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, currentStock: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!challan) throw new NotFoundError("Challan", id);
  return challan;
}

export async function createChallan(input: CreateChallanInput, userId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new NotFoundError("Customer", input.customerId);

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  const missingId = productIds.find((pid) => !products.find((p) => p.id === pid));
  if (missingId) throw new NotFoundError("Product", missingId);

  const productMap = new Map(products.map((p) => [p.id, p]));

  return prisma.$transaction(async (tx) => {
    const challanNumber = await generateChallanNumber(tx);
    const totalQuantity = input.items.reduce((sum, i) => sum + i.quantity, 0);

    return tx.challan.create({
      data: {
        challanNumber,
        customerId: input.customerId,
        totalQuantity,
        createdById: userId,
        items: {
          create: input.items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              // Snapshot the product details at order time — price/name changes later won't affect this challan
              productNameSnapshot: product.name,
              productSkuSnapshot: product.sku,
              unitPriceSnapshot: product.unitPrice,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
      },
    });
  });
}

export async function updateChallan(id: string, input: UpdateChallanInput) {
  const challan = await prisma.challan.findUnique({ where: { id }, include: { items: true } });
  if (!challan) throw new NotFoundError("Challan", id);

  if (challan.status !== ChallanStatus.DRAFT) {
    throw new ConflictError(`Challan ${challan.challanNumber} is ${challan.status} and can't be edited`);
  }

  if (input.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new NotFoundError("Customer", input.customerId);
  }

  return prisma.$transaction(async (tx) => {
    if (input.items) {
      const productIds = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const missingId = productIds.find((pid) => !products.find((p) => p.id === pid));
      if (missingId) throw new NotFoundError("Product", missingId);

      const productMap = new Map(products.map((p) => [p.id, p]));

      // Replace all items — simpler than doing a diff for draft edits
      await tx.challanItem.deleteMany({ where: { challanId: id } });

      const totalQuantity = input.items.reduce((sum, i) => sum + i.quantity, 0);

      return tx.challan.update({
        where: { id },
        data: {
          ...(input.customerId ? { customerId: input.customerId } : {}),
          totalQuantity,
          items: {
            create: input.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                productNameSnapshot: product.name,
                productSkuSnapshot: product.sku,
                unitPriceSnapshot: product.unitPrice,
                quantity: item.quantity,
              };
            }),
          },
        },
        include: { customer: { select: { id: true, name: true } }, items: true },
      });
    }

    return tx.challan.update({
      where: { id },
      data: { ...(input.customerId ? { customerId: input.customerId } : {}) },
      include: { customer: { select: { id: true, name: true } }, items: true },
    });
  });
}

// Confirm challan and deduct stock.
// Uses SELECT FOR UPDATE to lock product rows so two concurrent confirms
// can't both pass the stock check for the same low-stock product.
export async function confirmChallanAndDeductStock(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) throw new NotFoundError("Challan", id);

    if (challan.status !== ChallanStatus.DRAFT) {
      throw new ConflictError(`Challan ${challan.challanNumber} is already ${challan.status}`);
    }

    const insufficientItems: Array<{ productName: string; available: number; requested: number }> = [];

    for (const item of challan.items) {
      const [product] = await tx.$queryRaw<Array<{ id: string; currentStock: number; name: string }>>`
        SELECT id, "currentStock", name FROM "Product" WHERE id = ${item.productId} FOR UPDATE
      `;

      if (!product) throw new NotFoundError("Product", item.productId);

      if (product.currentStock < item.quantity) {
        insufficientItems.push({
          productName: item.productNameSnapshot,
          available: product.currentStock,
          requested: item.quantity,
        });
      }
    }

    if (insufficientItems.length > 0) {
      throw new UnprocessableError(
        `Insufficient stock for ${insufficientItems.length} product(s)`,
        insufficientItems
      );
    }

    for (const item of challan.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantityChanged: item.quantity,
          type: StockMovementType.OUT,
          reason: `Challan confirmed: ${challan.challanNumber}`,
          createdById: userId,
        },
      });
    }

    return tx.challan.update({
      where: { id },
      data: { status: ChallanStatus.CONFIRMED, confirmedAt: new Date() },
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
      },
    });
  });
}

// Cancel a challan. If it was already confirmed, stock is restored.
export async function cancelChallan(id: string, userId: string) {
  const challan = await prisma.challan.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!challan) throw new NotFoundError("Challan", id);

  if (challan.status === ChallanStatus.CANCELLED) {
    throw new ConflictError(`Challan ${challan.challanNumber} is already cancelled`);
  }

  const wasConfirmed = challan.status === ChallanStatus.CONFIRMED;

  return prisma.$transaction(async (tx) => {
    if (wasConfirmed) {
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            type: StockMovementType.IN,
            reason: `Challan cancelled: ${challan.challanNumber}`,
            createdById: userId,
          },
        });
      }
    }

    return tx.challan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED },
      include: { customer: { select: { id: true, name: true } }, items: true },
    });
  });
}
