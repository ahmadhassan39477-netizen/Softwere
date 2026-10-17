import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import {
  VPN_DEFAULT_DISPLAY,
  VPN_DISPLAY_SETTING_KEY,
  VPN_SETTING_KEY,
} from "@/lib/vpn-proxy";

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  const real = req.headers.get("x-real-ip")?.trim();
  return real || null;
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const [keyRow, nameRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: VPN_SETTING_KEY } }),
    prisma.setting.findUnique({ where: { key: VPN_DISPLAY_SETTING_KEY } }),
  ]);

  const ready = Boolean(keyRow?.value?.trim());
  const displayName = nameRow?.value?.trim() || VPN_DEFAULT_DISPLAY;

  return Response.json({
    connected: false,
    ready,
    displayName,
    currentIp: clientIp(req),
    plans: [],
    products: [
      {
        id: "datacenter",
        title: "Datacenter proxy",
        blurb: "Fast shared IPs for light browsing and checks. Not live until a provider key is saved.",
      },
      {
        id: "residential",
        title: "Residential proxy",
        blurb: "IPs that look like home connections. Not live until a provider key is saved.",
      },
      {
        id: "vpn",
        title: "VPN config",
        blurb: "A config file you import into a VPN app. Not live until a provider key is saved.",
      },
    ],
    message: ready
      ? "A provider key is saved in Admin. We still will not show a fake tunnel or invented endpoints. Plans appear after that API is wired."
      : "VPN and proxy plans are not for sale yet. They go live when a provider key is pasted in Admin. This page will never pretend you are connected.",
  });
}
