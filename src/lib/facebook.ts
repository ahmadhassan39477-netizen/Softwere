import { createHmac, timingSafeEqual } from "crypto";

const graphVersion = process.env.FACEBOOK_GRAPH_VERSION || "v23.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

async function graph<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${graphBase}/${path}`, { ...init, cache: "no-store" });
  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body.error?.message || "Facebook Graph API request failed");
  }
  return body as T;
}

export async function exchangeFacebookCode(code: string, redirectUri: string) {
  const query = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID || "",
    client_secret: process.env.FACEBOOK_APP_SECRET || "",
    redirect_uri: redirectUri,
    code,
  });
  return graph<{ access_token: string; expires_in?: number }>(`oauth/access_token?${query}`);
}

export async function getFacebookPages(userToken: string) {
  const query = new URLSearchParams({
    access_token: userToken,
    fields: "id,name,access_token",
    limit: "100",
  });
  return graph<{ data: Array<{ id: string; name: string; access_token: string }> }>(
    `me/accounts?${query}`,
  );
}

export async function sendFacebookMessage(pageToken: string, recipientId: string, text: string) {
  return graph<{ message_id: string }>("me/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: pageToken,
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });
}

export async function publishCatalogProduct(
  catalogId: string,
  pageToken: string,
  product: {
    sku: string;
    title: string;
    description: string;
    price: string;
    stock: number;
    imageUrl?: string;
    category: string;
    condition: string;
  },
) {
  const body = new URLSearchParams({
    access_token: pageToken,
    retailer_id: product.sku,
    name: product.title,
    description: product.description,
    price: `${Math.round(Number(product.price) * 100)}`,
    currency: "USD",
    availability: product.stock > 0 ? "in stock" : "out of stock",
    condition: product.condition === "NEW" ? "new" : "used",
    category: product.category,
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
    ...(product.imageUrl ? { image_url: product.imageUrl } : {}),
  });
  return graph<{ id: string }>(`${catalogId}/products`, { method: "POST", body });
}

export function verifyFacebookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const received = Buffer.from(signature.slice(7));
  return expected.length === received.length && timingSafeEqual(expected, received);
}
