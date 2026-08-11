import { z } from "zod";

const challanItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

export const createChallanSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(challanItemSchema).min(1, "At least one item is required"),
  // Items are validated for duplicates at the service layer
});

export const updateChallanSchema = z.object({
  customerId: z.string().min(1).optional(),
  items: z.array(challanItemSchema).min(1).optional(),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type UpdateChallanInput = z.infer<typeof updateChallanSchema>;
