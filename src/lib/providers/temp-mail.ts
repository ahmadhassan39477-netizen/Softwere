import { nanoid } from "nanoid";

const MOCK_DOMAINS = ["mail.tempempire.dev", "inbox.tempempire.dev"];

export function listDomains(): string[] {
  try {
    return MOCK_DOMAINS;
  } catch {
    return MOCK_DOMAINS;
  }
}

export function generateAddress(domain?: string): { address: string; domain: string } {
  const d = domain && MOCK_DOMAINS.includes(domain) ? domain : MOCK_DOMAINS[0];
  const local = `te_${nanoid(10).toLowerCase()}`;
  return { address: `${local}@${d}`, domain: d };
}

/** Mock inbound message generator for polling demos */
export function maybeMockInbound(address: string, messageCount: number) {
  if (messageCount > 0) return null;
  // After first poll cycles, callers inject based on age — kept simple here
  return {
    fromAddr: "noreply@example.com",
    subject: `Welcome to ${address}`,
    textBody: "This is a mock temp-mail message for local development.",
    htmlBody: `<p>This is a <strong>mock</strong> temp-mail message for local development.</p>`,
    attachments: JSON.stringify([]),
  };
}
