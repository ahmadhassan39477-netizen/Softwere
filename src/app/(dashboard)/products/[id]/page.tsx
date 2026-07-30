import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { PublishingActions } from "@/components/publishing-actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const [product, accounts] = await Promise.all([
    prisma.product.findFirst({ where: { id: params.id, userId: user.id } }),
    prisma.connectedAccount.findMany({ where: { userId: user.id, platform: "FACEBOOK" }, select: { id: true, pageName: true, catalogId: true } }),
  ]);
  if (!product) notFound();
  const serialized = { ...product, price: product.price.toString() };
  return (
    <>
      <p className="text-sm text-slate-500">Product library</p><h1 className="mt-1 text-3xl font-bold">Edit product</h1>
      <ProductForm product={serialized} />
      <PublishingActions product={{ id: product.id, title: product.title, description: product.description, price: product.price.toString() }} accounts={accounts.map(({ pageName, ...account }) => ({ ...account, name: pageName }))} />
    </>
  );
}
