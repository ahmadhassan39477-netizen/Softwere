"use client";

import { useSession } from "next-auth/react";

const BASE = typeof window !== "undefined" ? window.location.origin : "https://tempempire.com";

export default function ApiDocsPage() {
  const { data: session } = useSession();
  const key = session?.user?.apiKey ?? "te_live_YOUR_API_KEY";

  const curl = `curl -s "${BASE}/api/v1/countries" \\
  -H "X-Api-Key: ${key}"`;

  const python = `import requests

headers = {"X-Api-Key": "${key}"}
countries = requests.get("${BASE}/api/v1/countries", headers=headers).json()
services = requests.get("${BASE}/api/v1/services", params={"country": "US"}, headers=headers).json()
order = requests.post("${BASE}/api/v1/purchase", json={
    "countryCode": "US", "serviceSlug": "whatsapp", "server": 1
}, headers=headers).json()
otp = requests.get(f"${BASE}/api/v1/otp/{order['order']['id']}", headers=headers).json()
balance = requests.get("${BASE}/api/v1/balance", headers=headers).json()`;

  const js = `const headers = { "X-Api-Key": "${key}", "Content-Type": "application/json" };
const countries = await fetch("${BASE}/api/v1/countries", { headers }).then(r => r.json());
const order = await fetch("${BASE}/api/v1/purchase", {
  method: "POST", headers,
  body: JSON.stringify({ countryCode: "US", serviceSlug: "telegram", server: 1 })
}).then(r => r.json());
const otp = await fetch(\`${BASE}/api/v1/otp/\${order.order.id}\`, { headers }).then(r => r.json());`;

  const php = `<?php
$headers = ["X-Api-Key: ${key}", "Content-Type: application/json"];
$ch = curl_init("${BASE}/api/v1/balance");
curl_setopt_array($ch, [CURLOPT_HTTPHEADER => $headers, CURLOPT_RETURNTRANSFER => true]);
echo curl_exec($ch);`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Reseller API</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Authenticate with <code className="text-[var(--accent-2)]">X-Api-Key</code> or{" "}
          <code className="text-[var(--accent-2)]">Authorization: Bearer</code>. Manage keys in Settings.
        </p>
      </div>

      <div className="panel p-5 space-y-2 text-sm">
        <h2 className="font-semibold">Endpoints</h2>
        <ul className="space-y-1 text-[var(--text-muted)] font-mono text-xs sm:text-sm">
          <li>GET /api/v1/countries</li>
          <li>GET /api/v1/services?country=US&amp;q=whatsapp</li>
          <li>POST /api/v1/purchase</li>
          <li>GET /api/v1/otp/:orderId</li>
          <li>POST /api/v1/cancel/:orderId</li>
          <li>GET /api/v1/balance</li>
        </ul>
      </div>

      {[
        { title: "cURL", code: curl },
        { title: "Python", code: python },
        { title: "JavaScript", code: js },
        { title: "PHP", code: php },
      ].map((block) => (
        <div key={block.title} className="panel p-5">
          <h3 className="font-semibold mb-3">{block.title}</h3>
          <pre className="overflow-x-auto text-xs sm:text-sm font-mono text-[var(--text-muted)] whitespace-pre-wrap">
            {block.code}
          </pre>
        </div>
      ))}
    </div>
  );
}
