import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z
    .object({ aiAutoReply: z.boolean().optional(), catalogId: z.string().trim().max(100).nullable().optional() })
    .safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid account settings" }, { status: 400 });
  const account = await prisma.account.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json(await prisma.account.update({ where: { id: account.id }, data: parsed.data }));
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await prisma.account.deleteMany({ where: { id: params.id, userId: session.user.id } });
  if (!result.count) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
