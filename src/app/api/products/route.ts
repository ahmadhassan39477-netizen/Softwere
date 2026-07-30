import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check all product fields." }, { status: 400 });
  }
  try {
    const product = await prisma.product.create({
      data: { ...parsed.data, userId: session.user.id },
    });
    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "SKU must be unique in your product library." }, { status: 409 });
  }
}
