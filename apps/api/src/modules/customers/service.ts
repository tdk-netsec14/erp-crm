import { CustomerStatus, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ForbiddenError } from "../../lib/errors.js";
import { getPaginationParams, paginate } from "../../lib/pagination.js";
import type { CreateCustomerInput, UpdateCustomerInput, AddFollowUpInput } from "./schemas.js";

export async function listCustomers(query: {
  page?: string;
  limit?: string;
  status?: string;
  search?: string;
}) {
  const { page, limit, offset } = getPaginationParams(query);

  const where = {
    ...(query.status ? { status: query.status as CustomerStatus } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { businessName: { contains: query.search, mode: "insensitive" as const } },
            { mobile: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return paginate(data, total, page, limit);
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      followUps: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { createdBy: { select: { id: true, name: true } } },
      },
    },
  });
  if (!customer) throw new NotFoundError("Customer", id);
  return customer;
}

export async function createCustomer(input: CreateCustomerInput, userId: string) {
  return prisma.customer.create({
    data: {
      ...input,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function updateCustomer(id: string, input: UpdateCustomerInput, userId: string, userRole: Role) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new NotFoundError("Customer", id);

  // Sales reps can only edit their own customers
  if (userRole === Role.SALES && customer.createdById !== userId) {
    throw new ForbiddenError("You can only edit customers you added");
  }

  return prisma.customer.update({
    where: { id },
    data: {
      ...input,
      followUpDate: input.followUpDate !== undefined
        ? input.followUpDate ? new Date(input.followUpDate) : null
        : undefined,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function deleteCustomer(id: string, userRole: Role) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new NotFoundError("Customer", id);

  if (userRole === Role.ADMIN) {
    await prisma.customer.delete({ where: { id } });
    return { deleted: true };
  }

  // Non-admins just mark as inactive to preserve challan history
  return prisma.customer.update({
    where: { id },
    data: { status: CustomerStatus.INACTIVE },
  });
}

export async function listFollowUps(customerId: string, query: { page?: string; limit?: string }) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundError("Customer", customerId);

  const { page, limit, offset } = getPaginationParams(query);

  const [data, total] = await Promise.all([
    prisma.customerFollowUp.findMany({
      where: { customerId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.customerFollowUp.count({ where: { customerId } }),
  ]);

  return paginate(data, total, page, limit);
}

export async function addFollowUp(customerId: string, input: AddFollowUpInput, userId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundError("Customer", customerId);

  return prisma.customerFollowUp.create({
    data: {
      customerId,
      note: input.note,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}
