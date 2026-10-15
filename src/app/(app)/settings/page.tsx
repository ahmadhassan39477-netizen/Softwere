"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { copyText } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const [apiKey, setApiKey] = useState(session?.user?.apiKey ?? "");
  const [msg, setMsg] = useState("");

  if (status === "unauthenticated") {
    return (
      <div className="panel p-8 text-center">
        <Link href="/login" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  async function regenerate() {
    const res = await fetch("/api/settings/api-key", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Failed");
      return;
    }
    setApiKey(data.apiKey);
    setMsg("API key rotated");
    await update();
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">{session?.user?.email}</p>
      </div>
      <div className="panel p-5 space-y-3">
        <h2 className="font-semibold">Reseller API key</h2>
        <code className="block panel px-3 py-2 text-xs font-mono break-all">
          {apiKey || session?.user?.apiKey || "—"}
        </code>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => copyText(apiKey || session?.user?.apiKey || "")}
          >
            Copy
          </button>
          <button className="btn btn-primary" onClick={regenerate}>
            Regenerate
          </button>
        </div>
        {msg && <p className="text-sm text-[var(--accent-2)]">{msg}</p>}
      </div>
    </div>
  );
}
