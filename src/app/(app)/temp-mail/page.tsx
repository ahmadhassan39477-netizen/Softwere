"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, Mail, Plus, RefreshCw } from "lucide-react";
import { copyText } from "@/lib/utils";

type Mailbox = {
  id: string;
  address: string;
  messageCount: number;
  expiresAt: string;
};

type InboxMessage = {
  id: string;
  from: string;
  subject: string;
  intro: string;
  receivedAt: string;
};

function apiError(res: Response, data: { error?: string }, fallback: string) {
  return data.error || (res.status >= 500 ? fallback : fallback);
}

export default function TempMailPage() {
  const { status } = useSession();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const list = useQuery({
    queryKey: ["temp-mail"],
    enabled: status === "authenticated",
    refetchInterval: 30_000,
    queryFn: async () => {
      const res = await fetch("/api/temp-mail");
      const data = (await res.json()) as {
        error?: string;
        ready?: boolean;
        domains: string[];
        mails: Mailbox[];
      };
      if (!res.ok && !data.mails) {
        throw new Error(
          data.error ||
            "Temp Mail is temporarily unavailable. The inbox service is down. Try again in a minute.",
        );
      }
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/temp-mail", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            "Temp Mail is temporarily unavailable. The inbox service is down. Try again in a minute.",
        );
      }
      return data as { mail: Mailbox };
    },
    onSuccess: (data) => {
      setSelected(data.mail.id);
      setOpenId(null);
      qc.invalidateQueries({ queryKey: ["temp-mail"] });
    },
  });

  const inbox = useQuery({
    queryKey: ["temp-mail-inbox", selected],
    enabled: Boolean(selected),
    refetchInterval: 5_000,
    queryFn: async () => {
      const res = await fetch(`/api/temp-mail/${selected}/inbox`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          apiError(
            res,
            data,
            "Temp Mail is temporarily unavailable. The inbox service is down. Try again in a minute.",
          ),
        );
      }
      return data as {
        mail: { id: string; address: string };
        messages: InboxMessage[];
        checkedAt: string;
      };
    },
  });

  const body = useQuery({
    queryKey: ["temp-mail-body", selected, openId],
    enabled: Boolean(selected && openId),
    queryFn: async () => {
      const res = await fetch(`/api/temp-mail/${selected}/inbox/${openId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not open that message.");
      }
      return data as {
        message: { id: string; from: string; subject: string; textBody: string; receivedAt: string };
      };
    },
  });

  useEffect(() => {
    if (!selected && list.data?.mails?.[0]) setSelected(list.data.mails[0].id);
  }, [list.data, selected]);

  useEffect(() => {
    if (selected && inbox.data?.messages) {
      setCounts((prev) => ({ ...prev, [selected]: inbox.data.messages.length }));
    }
  }, [inbox.data, selected]);

  if (status === "unauthenticated") {
    return (
      <div className="panel p-8 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">Temp Mail Plus</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
          Sign in to generate a free disposable address and read real incoming mail. Wallet
          credit is not required for email.
        </p>
        <Link href="/login?callbackUrl=/services" className="btn btn-primary mt-6 inline-flex">
          Sign in
        </Link>
      </div>
    );
  }

  const current = list.data?.mails.find((m) => m.id === selected);
  const messages = inbox.data?.messages ?? [];
  const listError = list.error instanceof Error ? list.error.message : list.data?.error;
  const inboxError = inbox.error instanceof Error ? inbox.error.message : null;
  const createError = create.error instanceof Error ? create.error.message : null;

  async function onCopy(address: string) {
    await copyText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[16rem]">
          <h1 className="text-2xl font-bold">Temp Mail Plus</h1>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            Free disposable inbox on your account — no wallet credit needed. Generate an
            address, copy it, and read real mail here. Nothing is faked.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          <Plus size={16} /> {create.isPending ? "Creating…" : "New address"}
        </button>
      </div>

      {(listError || createError) && (
        <p className="panel px-4 py-3 text-sm text-[#fda4af]" role="alert">
          {createError || listError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="panel p-4 space-y-2">
          {(list.data?.mails ?? []).map((m) => {
            const n = counts[m.id] ?? m.messageCount;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelected(m.id);
                  setOpenId(null);
                }}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                  selected === m.id
                    ? "bg-[color-mix(in_oklab,var(--accent)_22%,transparent)]"
                    : "hover:bg-[var(--card-hover)]"
                }`}
              >
                <div className="truncate font-mono text-xs">{m.address}</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {n} {n === 1 ? "message" : "messages"}
                </div>
              </button>
            );
          })}
          {!list.data?.mails?.length && (
            <p className="text-sm text-[var(--text-muted)]">
              No addresses yet. Click New address — it is free.
            </p>
          )}
        </div>

        <div className="panel p-4 space-y-4">
          {current ? (
            <>
              <div className="flex gap-2 items-center">
                <code className="flex-1 panel px-3 py-2 font-mono text-sm truncate">
                  {current.address}
                </code>
                <button
                  type="button"
                  className="btn btn-ghost px-3"
                  onClick={() => onCopy(current.address)}
                  aria-label="Copy address"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost px-3"
                  onClick={() => inbox.refetch()}
                  aria-label="Refresh inbox"
                >
                  <RefreshCw size={16} className={inbox.isFetching ? "animate-spin" : ""} />
                </button>
              </div>
              {copied && (
                <p className="text-xs text-[var(--accent)]">Address copied.</p>
              )}
              <p className="text-xs text-[var(--text-muted)]">
                Checking for new mail every few seconds
                {inbox.data?.checkedAt
                  ? ` · last check ${new Date(inbox.data.checkedAt).toLocaleTimeString()}`
                  : ""}
                .
              </p>
              {inboxError && (
                <p className="text-sm text-[#fda4af]" role="alert">
                  {inboxError}
                </p>
              )}
              <div className="space-y-2">
                {messages.map((msg) => {
                  const open = openId === msg.id;
                  return (
                    <article
                      key={msg.id}
                      className="rounded-xl border border-[var(--border)] overflow-hidden"
                    >
                      <button
                        type="button"
                        className="w-full text-left p-4 hover:bg-[var(--card-hover)]"
                        onClick={() => setOpenId(open ? null : msg.id)}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={14} className="text-[var(--accent-2)] shrink-0" />
                          <span className="font-medium truncate">{msg.subject}</span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          From {msg.from} · {new Date(msg.receivedAt).toLocaleString()}
                        </div>
                        {!open && msg.intro ? (
                          <p className="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">
                            {msg.intro}
                          </p>
                        ) : null}
                      </button>
                      {open && (
                        <div className="border-t border-[var(--border)] px-4 py-3">
                          {body.isLoading && (
                            <p className="text-sm text-[var(--text-muted)]">Opening message…</p>
                          )}
                          {body.error instanceof Error && (
                            <p className="text-sm text-[#fda4af]">{body.error.message}</p>
                          )}
                          {body.data?.message && (
                            <pre className="text-sm whitespace-pre-wrap font-sans">
                              {body.data.message.textBody}
                            </pre>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
                {!inbox.isLoading && !inboxError && !messages.length && (
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    Waiting for mail… This is a real inbox. Messages appear when someone emails
                    this address. Nothing is generated for demo.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Generate an address to open the inbox.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Inbox powered by{" "}
        <a
          href="https://mail.tm"
          className="text-[var(--accent)]"
          target="_blank"
          rel="noreferrer"
        >
          mail.tm
        </a>
        . Free on your account. SMS numbers are a separate paid product.
      </p>
    </div>
  );
}
