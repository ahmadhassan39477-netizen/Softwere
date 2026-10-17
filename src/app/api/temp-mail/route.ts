import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import {
  createMailbox,
  listDomains,
  TempMailProviderError,
} from "@/lib/providers/temp-mail";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const mails = await prisma.tempMail.findMany({
    where: {
      userId: user.id,
      active: true,
      providerSecret: { not: null },
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  try {
    const domains = await listDomains();
    return Response.json({
      provider: "mail.tm",
      ready: true,
      domains,
      mails: mails.map((m) => ({
        id: m.id,
        address: m.address,
        domain: m.domain,
        expiresAt: m.expiresAt,
        messageCount: m._count.messages,
      })),
    });
  } catch (err) {
    const message =
      err instanceof TempMailProviderError
        ? err.message
        : "Temp Mail is temporarily unavailable. The inbox service is down. Try again in a minute.";
    const status = err instanceof TempMailProviderError ? err.status : 503;
    return Response.json(
      {
        error: message,
        provider: "mail.tm",
        ready: false,
        domains: [],
        mails: mails.map((m) => ({
          id: m.id,
          address: m.address,
          domain: m.domain,
          expiresAt: m.expiresAt,
          messageCount: m._count.messages,
        })),
      },
      { status },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`tempmail:${user.id}`, 20);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const body = await req.json().catch(() => ({}));
  const preferred =
    typeof body?.domain === "string" ? body.domain : undefined;

  try {
    const created = await createMailbox(preferred);
    const mail = await prisma.tempMail.create({
      data: {
        userId: user.id,
        address: created.address,
        domain: created.domain,
        provider: "mailtm",
        providerSecret: created.password,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
      },
    });

    return Response.json(
      {
        mail: {
          id: mail.id,
          address: mail.address,
          domain: mail.domain,
          expiresAt: mail.expiresAt,
        },
      },
      { status: 201, headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    const message =
      err instanceof TempMailProviderError
        ? err.message
        : "Temp Mail is temporarily unavailable. The inbox service is down. Try again in a minute.";
    const status = err instanceof TempMailProviderError ? err.status : 503;
    return jsonError(message, status, rateLimitHeaders(rl));
  }
}
