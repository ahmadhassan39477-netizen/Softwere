import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { generateAddress, listDomains } from "@/lib/providers/temp-mail";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const mails = await prisma.tempMail.findMany({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  return Response.json({
    domains: listDomains(),
    mails: mails.map((m) => ({
      id: m.id,
      address: m.address,
      domain: m.domain,
      expiresAt: m.expiresAt,
      messageCount: m._count.messages,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`tempmail:${user.id}`, 20);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const body = await req.json().catch(() => ({}));
  const { address, domain } = generateAddress(
    typeof body?.domain === "string" ? body.domain : undefined,
  );

  const mail = await prisma.tempMail.create({
    data: {
      userId: user.id,
      address,
      domain,
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    },
  });

  return Response.json(
    { mail: { id: mail.id, address: mail.address, domain: mail.domain, expiresAt: mail.expiresAt } },
    { status: 201, headers: rateLimitHeaders(rl) },
  );
}
