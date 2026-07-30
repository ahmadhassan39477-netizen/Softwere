import { z } from "zod";

export const productSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(10).max(5000),
  price: z.coerce.number().nonnegative().max(99999999),
  category: z.string().trim().min(2).max(100),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]),
  images: z.array(z.string().url()).max(12).default([]),
  sku: z.string().trim().min(1).max(80),
  stock: z.coerce.number().int().nonnegative().max(1000000),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});
