import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { createMailbox, TempMailProviderError } from "@/lib/providers/temp-mail";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

function isSchemaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /providerSecret|Unknown arg|does not exist|column/i.test(msg);
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const mails = await prisma.tempMail.findMany({
      where: { userId: user.id, active: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });

    return Response.json({
      provider: "mail.tm",
      ready: true,
      domains: [],
      mails: mails.map((m) => ({
        id: m.id,
        address: m.address,
        domain: m.domain,
        expiresAt: m.expiresAt,
        messageCount: m._count.messages,
      })),
    });
  } catch (err) {
    if (isSchemaError(err)) {
      return jsonError(
        "Temp Mail is updating. Wait one minute and refresh — then generate an address.",
        503,
      );
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`tempmail:${user.id}`, 20);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const body = await req.json().catch(() => ({}));
  const preferred = typeof body?.domain === "string" ? body.domain : undefined;

  try {
    const created = await createMailbox(preferred);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);

    try {
      const mail = await prisma.tempMail.create({
        data: {
          userId: user.id,
          address: created.address,
          domain: created.domain,
          provider: "mailtm",
          providerSecret: created.password,
          expiresAt,
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
      if (!isSchemaError(err)) throw err;
      const mail = await prisma.tempMail.create({
        data: {
          userId: user.id,
          address: created.address,
          domain: created.domain,
          expiresAt,
        },
      });
      await prisma.setting.upsert({
        where: { key: `tempmail_secret_${mail.id}` },
        create: { key: `tempmail_secret_${mail.id}`, value: created.password },
        update: { value: created.password },
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
    }
  } catch (err) {
    const message =
      err instanceof TempMailProviderError
        ? err.message
        : "Temp Mail is temporarily unavailable. The inbox service is down. Try again in a minute.";
    const status = err instanceof TempMailProviderError ? err.status : 503;
    return jsonError(message, status, rateLimitHeaders(rl));
  }
}
