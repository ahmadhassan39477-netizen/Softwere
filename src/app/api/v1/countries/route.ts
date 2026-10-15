import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`countries:${user.id}`);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const q = req.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";
  const countries = await prisma.country.findMany({
    where: {
      enabled: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { code: { contains: q.toUpperCase() } },
            ],
          }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return Response.json(
    {
      countries: countries.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        flag: c.flag,
        dialCode: c.dialCode,
        availability: c.availability,
      })),
    },
    { headers: rateLimitHeaders(rl) },
  );
}
