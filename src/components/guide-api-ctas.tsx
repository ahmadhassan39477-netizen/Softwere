"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { REGISTER_API, REGISTER_SERVICES } from "@/lib/guest-links";

/**
 * API docs / generate keys go through signup when logged out, then /api-docs.
 * Signed-in visitors open the gated docs (keys live in Settings).
 */
export function GuideApiCtas() {
  const { status } = useSession();
  const inShop = status === "authenticated";

  const items: { href: string; label: string; primary?: boolean }[] = [
    {
      href: inShop ? "/api-docs" : REGISTER_API,
      label: "API docs / generate keys",
      primary: true,
    },
    { href: inShop ? "/settings" : REGISTER_API, label: "Generate keys" },
    { href: inShop ? "/services" : REGISTER_SERVICES, label: "Services" },
  ];

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={item.primary ? "btn btn-primary" : "btn btn-ghost"}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
