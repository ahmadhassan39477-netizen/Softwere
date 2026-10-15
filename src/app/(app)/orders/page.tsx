"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { statusColor } from "@/lib/utils";

export default function OrdersPage() {
  const { status } = useSession();
  const orders = useQuery({
    queryKey: ["orders"],
    enabled: status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (status === "unauthenticated") {
    return (
      <div className="panel p-8 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link href="/login" className="btn btn-primary mt-6 inline-flex">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">History</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Order history</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">SMS OTP purchases and statuses.</p>
      </div>
      <div className="panel panel-accent overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="p-3">Service</th>
              <th className="p-3">Number</th>
              <th className="p-3">OTP</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {(orders.data?.orders ?? []).map(
              (o: {
                id: string;
                phoneNumber: string;
                otpCode: string | null;
                price: string;
                status: string;
                createdAt: string;
                country: { flag: string };
                service: { name: string };
              }) => (
                <tr key={o.id} className="border-b border-[var(--border)]">
                  <td className="p-3">
                    {o.country.flag} {o.service.name}
                  </td>
                  <td className="p-3 font-mono text-xs">{o.phoneNumber}</td>
                  <td className="p-3 font-mono">{o.otpCode ?? "—"}</td>
                  <td className="p-3 font-mono">${o.price}</td>
                  <td className="p-3">
                    <span className={`badge ${statusColor(o.status)}`}>{o.status}</span>
                  </td>
                  <td className="p-3 text-[var(--text-muted)]">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
