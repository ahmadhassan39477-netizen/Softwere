import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { rewriteListing } from "@/lib/openai";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z
    .object({ title: z.string().min(2).max(150), description: z.string().min(10).max(5000) })
    .safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Add a title and description first." }, { status: 400 });
  try {
    return NextResponse.json(await rewriteListing(parsed.data.title, parsed.data.description));
  } catch (error) {
    console.error("AI rewrite failed", error);
    return NextResponse.json({ error: "AI rewrite is temporarily unavailable." }, { status: 502 });
  }
}
