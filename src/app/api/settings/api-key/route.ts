import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const apiKey = `te_live_${nanoid(24)}`;
  await prisma.user.update({
    where: { id: user.id },
    data: { apiKey },
  });

  return Response.json({ apiKey });
}
