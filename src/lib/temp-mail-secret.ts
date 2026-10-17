import { prisma } from "@/lib/prisma";

export async function saveMailboxCreds(
  mailId: string,
  provider: string,
  secret: string,
) {
  await prisma.setting.upsert({
    where: { key: `tempmail_secret_${mailId}` },
    create: {
      key: `tempmail_secret_${mailId}`,
      value: JSON.stringify({ provider, secret }),
    },
    update: { value: JSON.stringify({ provider, secret }) },
  });
}

export async function mailboxCreds(mail: {
  id: string;
  provider?: string | null;
  providerSecret?: string | null;
}): Promise<{ secret: string | null; provider: string }> {
  if (mail.providerSecret?.trim()) {
    return {
      secret: mail.providerSecret,
      provider: mail.provider?.trim() || "mailtm",
    };
  }
  const row = await prisma.setting.findUnique({
    where: { key: `tempmail_secret_${mail.id}` },
  });
  if (!row?.value) {
    return { secret: null, provider: mail.provider?.trim() || "mailtm" };
  }
  try {
    const parsed = JSON.parse(row.value) as { provider?: string; secret?: string };
    if (parsed.secret) {
      return {
        secret: parsed.secret,
        provider: parsed.provider || mail.provider?.trim() || "mailtm",
      };
    }
  } catch {
    // plain secret from an earlier save
  }
  return { secret: row.value.trim() || null, provider: mail.provider?.trim() || "mailtm" };
}

export async function mailboxSecret(
  mail: { id: string; providerSecret?: string | null },
): Promise<string | null> {
  const creds = await mailboxCreds(mail);
  return creds.secret;
}
