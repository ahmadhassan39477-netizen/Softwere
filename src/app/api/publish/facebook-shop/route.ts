import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { publishCatalogProduct } from "@/lib/facebook";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ productId: z.string(), accountId: z.string() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Product and account are required." }, { status: 400 });

  const [product, account] = await Promise.all([
    prisma.product.findFirst({ where: { id: parsed.data.productId, userId: session.user.id } }),
    prisma.connectedAccount.findFirst({ where: { id: parsed.data.accountId, userId: session.user.id } }),
  ]);
  if (!product || !account) return NextResponse.json({ error: "Product or account not found." }, { status: 404 });
  if (!account.catalogId) {
    return NextResponse.json({ error: "Add a Facebook catalog ID to this account first." }, { status: 400 });
  }

  try {
    const result = await publishCatalogProduct(account.catalogId, decryptSecret(account.accessToken), {
      sku: product.sku,
      title: product.title,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock,
      imageUrl: product.images[0],
      category: product.category,
      condition: product.condition,
    });
    return NextResponse.json({ ok: true, externalId: result.id });
  } catch (error) {
    console.error("Facebook catalog publish failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Publishing failed." }, { status: 502 });
  }
}
