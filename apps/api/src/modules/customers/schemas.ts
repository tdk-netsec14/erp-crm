import { z } from "zod";
import { CustomerType, CustomerStatus } from "@prisma/client";

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(100),
  mobile: z.string().min(10).max(15),
  email: z.string().email().optional().nullable(),
  businessName: z.string().max(150).optional().nullable(),
  gstNumber: z.string().max(20).optional().nullable(),
  type: z.nativeEnum(CustomerType),
  address: z.string().min(1).max(500),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const addFollowUpSchema = z.object({
  note: z.string().min(1).max(2000),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type AddFollowUpInput = z.infer<typeof addFollowUpSchema>;
