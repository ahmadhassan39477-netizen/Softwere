import { prisma } from "@/lib/prisma";

export async function mailboxSecret(
  mail: { id: string; providerSecret?: string | null },
): Promise<string | null> {
  if (mail.providerSecret?.trim()) return mail.providerSecret;
  const row = await prisma.setting.findUnique({
    where: { key: `tempmail_secret_${mail.id}` },
  });
  return row?.value?.trim() || null;
}
