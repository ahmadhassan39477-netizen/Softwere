import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const providers = await prisma.providerConfig.findMany({ orderBy: { name: "asc" } });
  return Response.json({
    providers: providers.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      enabled: p.enabled,
      baseUrl: p.baseUrl,
      hasApiKey: Boolean(p.apiKey),
    })),
  });
}

const patchSchema = z.object({
  key: z.string(),
  enabled: z.boolean().optional(),
  apiKey: z.string().nullable().optional(),
  baseUrl: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input");

  const updated = await prisma.providerConfig.update({
    where: { key: parsed.data.key },
    data: {
      ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      ...(parsed.data.apiKey !== undefined ? { apiKey: parsed.data.apiKey } : {}),
      ...(parsed.data.baseUrl !== undefined ? { baseUrl: parsed.data.baseUrl } : {}),
    },
  });

  return Response.json({
    provider: {
      key: updated.key,
      enabled: updated.enabled,
      hasApiKey: Boolean(updated.apiKey),
    },
  });
}
