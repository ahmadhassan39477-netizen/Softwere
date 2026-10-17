"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, Plus, Mail } from "lucide-react";
import { copyText } from "@/lib/utils";

export default function TempMailPage() {
  const { status } = useSession();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["temp-mail"],
    enabled: status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/temp-mail");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        domains: string[];
        mails: { id: string; address: string; messageCount: number; expiresAt: string }[];
      }>;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/temp-mail", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setSelected(data.mail.id);
      qc.invalidateQueries({ queryKey: ["temp-mail"] });
    },
  });

  const inbox = useQuery({
    queryKey: ["temp-mail-inbox", selected],
    enabled: Boolean(selected),
    refetchInterval: 3000,
    queryFn: async () => {
      const res = await fetch(`/api/temp-mail/${selected}/inbox`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  useEffect(() => {
    if (!selected && list.data?.mails?.[0]) setSelected(list.data.mails[0].id);
  }, [list.data, selected]);

  if (status === "unauthenticated") {
    return (
      <div className="panel p-8 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">Temp Mail Plus</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
          Temp Mail Plus-style disposable email — sign in to generate a free alias on this OTP
          website.
        </p>
        <Link href="/login?callbackUrl=/services" className="btn btn-primary mt-6 inline-flex">
          Sign in
        </Link>
      </div>
    );
  }

  const current = list.data?.mails.find((m) => m.id === selected);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Temp Mail Plus</h1>
          <p className="text-[var(--text-muted)] text-sm">
            Temp Mail Plus-style one-click aliases with live inbox polling.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus size={16} /> New address
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="panel p-4 space-y-2">
          {(list.data?.mails ?? []).map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                selected === m.id ? "bg-[color-mix(in_oklab,var(--accent)_22%,transparent)]" : "hover:bg-[var(--card-hover)]"
              }`}
            >
              <div className="truncate font-mono text-xs">{m.address}</div>
              <div className="text-xs text-[var(--text-muted)]">{m.messageCount} messages</div>
            </button>
          ))}
          {!list.data?.mails?.length && (
            <p className="text-sm text-[var(--text-muted)]">No addresses yet.</p>
          )}
        </div>

        <div className="panel p-4 space-y-4">
          {current ? (
            <>
              <div className="flex gap-2 items-center">
                <code className="flex-1 panel px-3 py-2 font-mono text-sm truncate">{current.address}</code>
                <button className="btn btn-ghost px-3" onClick={() => copyText(current.address)}>
                  <Copy size={16} />
                </button>
              </div>
              <div className="space-y-3">
                {(inbox.data?.messages ?? []).map(
                  (msg: {
                    id: string;
                    from: string;
                    subject: string;
                    textBody?: string;
                    htmlBody?: string;
                    receivedAt: string;
                  }) => (
                    <article key={msg.id} className="rounded-xl border border-[var(--border)] p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail size={14} className="text-[var(--accent-2)]" />
                        <span className="font-medium">{msg.subject}</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        From {msg.from} · {new Date(msg.receivedAt).toLocaleString()}
                      </div>
                      {msg.htmlBody ? (
                        <div
                          className="mt-3 text-sm prose prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: msg.htmlBody }}
                        />
                      ) : (
                        <pre className="mt-3 text-sm whitespace-pre-wrap">{msg.textBody}</pre>
                      )}
                    </article>
                  ),
                )}
                {!inbox.data?.messages?.length && (
                  <p className="text-sm text-[var(--text-muted)]">Waiting for mail… (mock arrives after a few seconds)</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Generate an address to open the inbox.</p>
          )}
        </div>
      </div>
    </div>
  );
}
