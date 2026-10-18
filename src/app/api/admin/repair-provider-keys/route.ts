import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { probeFiveSimApiKey } from "@/lib/sms/adapters/fivesim";
import { probeGrizzlyApiKey } from "@/lib/sms/adapters/grizzlysms";
import { probeSmsManToken } from "@/lib/sms/adapters/sms-man";
import {
  DEFAULT_SLOT_MARKUP,
  ensureProviderSlots,
  envKeyForType,
  looksLikeApiDocsUrl,
  sanitizeApiKeyForType,
  slotKeyForServer,
  type SlotProviderType,
} from "@/lib/sms/provider-slots";
import { maskKey } from "@/lib/sms/service-map";

type Candidate = { source: string; key: string };

/**
 * One-shot Admin repair: copy a real provider token onto empty server-N slots
 * from legacy ProviderSetting / ProviderConfig / (env only when wallet > 0).
 * Never returns or logs raw tokens.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  await ensureProviderSlots().catch(() => undefined);

  const results: Record<
    string,
    {
      repaired: boolean;
      source?: string;
      masked?: string;
      balance?: number | null;
      enabled?: boolean;
      note?: string;
    }
  > = {};

  // --- Server 1 = 5SIM ---
  // Scan every ProviderSetting / ProviderConfig row (wrong-slot pastes) + env
  // with balance>0. Never return or log raw tokens.
  {
    const slotKey = slotKeyForServer(1);
    const row = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
    const type: SlotProviderType = "5sim";
    const existing = sanitizeApiKeyForType(type, row?.apiKey);
    if (existing) {
      const probe = await probeFiveSimApiKey(existing);
      results[slotKey] = {
        repaired: false,
        source: "already-on-slot",
        masked: maskKey(existing),
        balance: probe.balance,
        enabled: row?.enabled ?? true,
        note: probe.ok
          ? "Slot already has a key"
          : "Slot key present but provider rejected it",
      };
      if (row && !row.enabled && probe.ok) {
        await prisma.providerSetting.update({
          where: { key: slotKey },
          data: { enabled: true },
        });
        results[slotKey].enabled = true;
        results[slotKey].note = "Re-enabled existing Server 1 key";
      }
    } else {
      const candidates: Candidate[] = [];
      const seen = new Set<string>();
      const pushCand = (source: string, raw: string | null | undefined) => {
        const cleaned = sanitizeApiKeyForType(type, raw);
        if (!cleaned || seen.has(cleaned)) return;
        seen.add(cleaned);
        candidates.push({ source, key: cleaned });
      };

      const settingRows = await prisma.providerSetting.findMany({
        select: { key: true, apiKey: true, providerType: true },
      });
      for (const s of settingRows) {
        if (s.key === slotKey) continue;
        pushCand(`providerSetting:${s.key}`, s.apiKey);
      }

      const configRows = await prisma.providerConfig.findMany({
        select: { key: true, apiKey: true },
      });
      for (const c of configRows) {
        pushCand(`providerConfig:${c.key}`, c.apiKey);
      }

      // Env only if that wallet actually has credit (her deposit account)
      const envRaw = envKeyForType(type)?.trim() || "";
      if (!envRaw) {
        results[`${slotKey}:env`] = {
          repaired: false,
          note: "No FIVESIM env var set",
        };
      } else if (looksLikeApiDocsUrl(envRaw) || !sanitizeApiKeyForType(type, envRaw)) {
        results[`${slotKey}:env`] = {
          repaired: false,
          note: "FIVESIM env looks like a URL/junk — not a profile API key (not copied)",
        };
      } else {
        const envKey = sanitizeApiKeyForType(type, envRaw)!;
        const envProbe = await probeFiveSimApiKey(envKey);
        if (envProbe.ok && envProbe.balance != null && envProbe.balance > 0) {
          pushCand("env:FIVESIM_API_KEY(balance>0)", envKey);
          results[`${slotKey}:env`] = {
            repaired: false,
            note: "Env 5SIM key has balance — will copy onto slot",
            balance: envProbe.balance,
            masked: maskKey(envKey),
          };
        } else {
          results[`${slotKey}:env`] = {
            repaired: false,
            note:
              envProbe.ok && (envProbe.balance == null || envProbe.balance <= 0)
                ? "Env 5SIM key has empty wallet — not copied (would buy-fail)"
                : "Env 5SIM key rejected by provider — not copied",
            balance: envProbe.balance,
            masked: maskKey(envKey),
          };
        }
      }

      results[`${slotKey}:scan`] = {
        repaired: false,
        note: `Probing ${candidates.length} stored candidate(s) against 5SIM profile`,
      };

      let applied: { source: string; key: string; balance: number | null } | null =
        null;
      let probedOk = 0;
      for (const c of candidates) {
        const probe = await probeFiveSimApiKey(c.key);
        if (!probe.ok) continue;
        probedOk += 1;
        // Prefer positive balance (her topped-up wallet); keep first valid otherwise
        if (probe.balance != null && probe.balance > 0) {
          applied = { source: c.source, key: c.key, balance: probe.balance };
          break;
        }
        if (!applied) {
          applied = { source: c.source, key: c.key, balance: probe.balance };
        }
      }
      results[`${slotKey}:scan`].note = `Probed ${candidates.length} candidate(s); ${probedOk} accepted by 5SIM`;

      if (applied) {
        await prisma.providerSetting.update({
          where: { key: slotKey },
          data: {
            apiKey: applied.key,
            providerType: "5sim",
            enabled: true,
            markupPercent: new Prisma.Decimal(DEFAULT_SLOT_MARKUP),
            ...(applied.balance != null
              ? {
                  lastBalance: new Prisma.Decimal(applied.balance),
                  lastBalanceAt: new Date(),
                }
              : {}),
          },
        });
        await prisma.providerConfig
          .upsert({
            where: { key: "5sim" },
            create: {
              key: "5sim",
              name: "5SIM",
              enabled: true,
              apiKey: applied.key,
            },
            update: { enabled: true, apiKey: applied.key },
          })
          .catch(() => undefined);
        results[slotKey] = {
          repaired: true,
          source: applied.source,
          masked: maskKey(applied.key),
          balance: applied.balance,
          enabled: true,
        };
      } else {
        results[slotKey] = {
          repaired: false,
          note: "No usable 5SIM profile token in any ProviderSetting/ProviderConfig/env-with-balance",
        };
      }
    }
  }

  // --- Server 2 = Grizzly: only fill if empty; never wipe working key ---
  {
    const slotKey = slotKeyForServer(2);
    const row = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
    const type: SlotProviderType = "grizzlysms";
    const existing = sanitizeApiKeyForType(type, row?.apiKey);
    if (existing) {
      results[slotKey] = {
        repaired: false,
        source: "already-on-slot",
        masked: maskKey(existing),
        enabled: row?.enabled ?? true,
        note: "Left Server 2 unchanged",
      };
      if (row && !row.enabled) {
        await prisma.providerSetting.update({
          where: { key: slotKey },
          data: { enabled: true },
        });
        results[slotKey].enabled = true;
        results[slotKey].note = "Re-enabled existing Server 2 key";
      }
    } else {
      const candidates: Candidate[] = [];
      for (const legacyKey of ["grizzlysms", "server-3"] as const) {
        const legacy = await prisma.providerSetting.findUnique({
          where: { key: legacyKey },
        });
        if (legacyKey === "server-3" && legacy?.providerType !== "grizzlysms") {
          continue;
        }
        const leg = sanitizeApiKeyForType(type, legacy?.apiKey);
        if (leg) candidates.push({ source: `legacy:${legacyKey}`, key: leg });
      }
      const cfg = await prisma.providerConfig.findUnique({
        where: { key: "grizzlysms" },
      });
      const cfgKey = sanitizeApiKeyForType(type, cfg?.apiKey);
      if (cfgKey) candidates.push({ source: "legacy-providerConfig:grizzlysms", key: cfgKey });

      let applied: Candidate | null = null;
      for (const c of candidates) {
        const probe = await probeGrizzlyApiKey(c.key, row?.baseUrl);
        if (probe.ok) {
          applied = c;
          break;
        }
      }
      if (applied) {
        await prisma.providerSetting.update({
          where: { key: slotKey },
          data: {
            apiKey: applied.key,
            providerType: "grizzlysms",
            enabled: true,
            markupPercent: new Prisma.Decimal(DEFAULT_SLOT_MARKUP),
          },
        });
        results[slotKey] = {
          repaired: true,
          source: applied.source,
          masked: maskKey(applied.key),
          enabled: true,
        };
      } else {
        results[slotKey] = {
          repaired: false,
          note: "Server 2 empty and no recoverable Grizzly key",
        };
      }
    }
  }

  // Server 3: report only (do not invent SMS-Man tokens)
  {
    const slotKey = slotKeyForServer(3);
    const row = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
    const existing = sanitizeApiKeyForType("sms-man", row?.apiKey);
    results[slotKey] = {
      repaired: false,
      masked: existing ? maskKey(existing) : undefined,
      enabled: row?.enabled,
      note: existing ? "Server 3 already keyed" : "Server 3 has no SMS-Man key (ok)",
    };
    void probeSmsManToken;
  }

  return Response.json({ ok: true, results });
}
