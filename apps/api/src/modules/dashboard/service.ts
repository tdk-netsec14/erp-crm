import { prisma } from "../../lib/prisma.js";
import { CustomerStatus, ChallanStatus } from "@prisma/client";

export async function getDashboardMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [
    lowStockProducts,
    recentChallans,
    followUpsDueToday,
    totalCustomers,
    totalChallansThisMonth,
  ] = await Promise.all([
    // Products where current stock is below their alert threshold
    prisma.product.findMany({
      where: { minStockAlert: { gt: 0 } },
      select: { id: true, name: true, sku: true, currentStock: true, minStockAlert: true, location: true },
      orderBy: { currentStock: "asc" },
      take: 10,
    }).then((products) => products.filter((p) => p.currentStock < p.minStockAlert)),

    prisma.challan.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),

    prisma.customer.findMany({
      where: {
        followUpDate: { gte: today, lt: tomorrow },
        status: { not: CustomerStatus.INACTIVE },
      },
      select: { id: true, name: true, mobile: true, status: true, followUpDate: true },
      orderBy: { followUpDate: "asc" },
    }),

    prisma.customer.count({ where: { status: CustomerStatus.ACTIVE } }),

    prisma.challan.count({
      where: {
        status: ChallanStatus.CONFIRMED,
        confirmedAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
        },
      },
    }),
  ]);

  return {
    lowStockProducts,
    recentChallans,
    followUpsDueToday,
    stats: {
      activeCustomers: totalCustomers,
      confirmedChallansThisMonth: totalChallansThisMonth,
      lowStockCount: lowStockProducts.length,
      followUpsDueTodayCount: followUpsDueToday.length,
    },
  };
}
