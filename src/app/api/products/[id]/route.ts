import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/app/api/products/route";

type Params = { params: { id: string } };

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Please check all product fields." }, { status: 400 });
  const found = await prisma.product.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!found) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  try {
    return NextResponse.json(await prisma.product.update({ where: { id: found.id }, data: parsed.data }));
  } catch {
    return NextResponse.json({ error: "SKU must be unique in your product library." }, { status: 409 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await prisma.product.deleteMany({ where: { id: params.id, userId: session.user.id } });
  if (!result.count) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
