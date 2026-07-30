import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid name, email, and password." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }
  await prisma.user.create({
    data: { name: parsed.data.name, email, password: await hash(parsed.data.password, 12) },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
