import { z } from "zod";
import { StockMovementType } from "@prisma/client";

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  category: z.string().min(1).max(100),
  unitPrice: z.number().positive("Unit price must be positive"),
  currentStock: z.number().int().min(0).default(0),
  minStockAlert: z.number().int().min(0).default(0),
  location: z.string().min(1).max(100),
});

export const updateProductSchema = createProductSchema
  .omit({ currentStock: true }) // Stock only changes via stock movements
  .partial();

export const createStockMovementSchema = z.object({
  quantityChanged: z.number().int().positive("Quantity must be a positive integer"),
  type: z.nativeEnum(StockMovementType),
  reason: z.string().min(1).max(500),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
